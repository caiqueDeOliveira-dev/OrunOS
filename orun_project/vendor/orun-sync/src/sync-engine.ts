import { deepEqualJson } from './deep-equal';
import type { SyncableLocalStore, Unsubscribe } from './local-store-interface';
import type { ConflictRecord, ConflictResolution, SyncRecord, SyncTransport } from './types';

interface PathSyncMeta {
  lastSyncedValue: unknown;
  lastSyncedRemoteUpdatedAt?: string;
}

export interface SyncEngineOptions {
  transport: SyncTransport;
  localStore: SyncableLocalStore;
  userId: string;
  deviceId: string;
  /** Paths que este engine deve sincronizar. Quem decide isso é o chamador (ex: filtrar por scope-map em @orun/settings). */
  syncedPaths: string[];
  /**
   * Se definido, o engine tenta reenviar pushes que falharam (ex: sem
   * internet) automaticamente a cada N ms enquanto houver algo na fila.
   * Se omitido, retry só acontece quando retryPendingPushes() é chamado
   * manualmente (ex: o app escuta o evento 'online' e chama isso).
   */
  retryIntervalMs?: number;
}

type ConflictListener = (conflicts: ConflictRecord[]) => void;
type PendingPushListener = (paths: string[]) => void;

/**
 * @orun/sync — SyncEngine
 *
 * Estratégia de conflito: MERGE MANUAL. O engine nunca decide sozinho entre
 * local e remoto quando os dois divergiram desde a última sync confirmada —
 * ele só aplica direto quando não há divergência local, e expõe o resto via
 * getConflicts()/subscribeConflicts() pra UI resolver com resolveConflict().
 *
 * Detecção de eco: cada push carrega o deviceId de quem escreveu. Quando o
 * evento realtime volta pro mesmo device que escreveu, o engine reconhece
 * como confirmação (não como mudança de outro device) e não re-processa.
 */
export class SyncEngine {
  private readonly transport: SyncTransport;
  private readonly localStore: SyncableLocalStore;
  private readonly userId: string;
  private readonly deviceId: string;
  private readonly syncedPaths: Set<string>;

  private syncMeta = new Map<string, PathSyncMeta>();
  private conflicts = new Map<string, ConflictRecord>();
  /** Paths que o engine está no meio de aplicar vindo do remoto — evita reagir ao próprio set() como se fosse edição do usuário. */
  private applyingRemote = new Set<string>();
  /**
   * Paths com uma edição local feita mas ainda NÃO confirmada pelo próprio
   * eco vindo do transporte. Marcado de forma síncrona no exato momento da
   * edição — isso é o que torna a detecção de conflito determinística: um
   * record de outro device chegando enquanto um path está "dirty" é
   * conflito garantido, independente de qualquer corrida entre pushes.
   */
  private pendingLocalEdits = new Set<string>();
  /** Pushes que falharam (ex: sem rede) e ainda não foram confirmados — reenviados via retryPendingPushes(). */
  private pendingPushQueue = new Map<string, SyncRecord>();
  private pendingPushListeners = new Set<PendingPushListener>();
  private retryTimer: ReturnType<typeof setInterval> | null = null;
  private readonly retryIntervalMs?: number;

  private localUnsubscribes: Unsubscribe[] = [];
  private transportUnsubscribe: Unsubscribe | null = null;
  private conflictListeners = new Set<ConflictListener>();

  constructor(options: SyncEngineOptions) {
    this.transport = options.transport;
    this.localStore = options.localStore;
    this.userId = options.userId;
    this.deviceId = options.deviceId;
    this.syncedPaths = new Set(options.syncedPaths);
    this.retryIntervalMs = options.retryIntervalMs;
  }

  async init(): Promise<void> {
    // 1. pull inicial: aplica direto, sem checar conflito — assume que o
    //    remoto é a fonte de verdade num device que está sincronizando pela
    //    primeira vez (não há "última sync confirmada" pra comparar ainda).
    const remoteRecords = await this.transport.pullAll(this.userId);
    for (const record of remoteRecords) {
      if (!this.syncedPaths.has(record.path)) continue;
      await this.applyRemoteDirect(record);
    }

    // 1b. paths sem dado remoto ainda: o valor local atual vira a baseline
    //     ("se ninguém me disse o contrário, presumo que meu valor atual é
    //     o combinado") — sem isso, a primeira comparação de divergência
    //     não teria contra o que comparar.
    for (const path of this.syncedPaths) {
      if (!this.syncMeta.has(path)) {
        const currentValue = await this.localStore.get(path);
        this.syncMeta.set(path, { lastSyncedValue: currentValue });
      }
    }

    // 2. escuta mudanças locais em cada path sincronizado
    for (const path of this.syncedPaths) {
      const unsub = this.localStore.subscribe(path, (newValue) => {
        void this.handleLocalChange(path, newValue);
      });
      this.localUnsubscribes.push(unsub);
    }

    // 3. escuta mudanças remotas em tempo real
    this.transportUnsubscribe = this.transport.subscribe(this.userId, (record) => {
      if (!this.syncedPaths.has(record.path)) return;
      void this.handleRemoteRecord(record);
    });

    // 4. retry automático opcional da fila de pushes que falharam
    if (this.retryIntervalMs !== undefined) {
      this.retryTimer = setInterval(() => {
        void this.retryPendingPushes();
      }, this.retryIntervalMs);
    }
  }

  dispose(): void {
    this.localUnsubscribes.forEach((unsub) => unsub());
    this.localUnsubscribes = [];
    this.transportUnsubscribe?.();
    this.transportUnsubscribe = null;
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /** Paths com um push pendente de reenvio (falhou pelo menos uma vez). */
  getPendingPushPaths(): string[] {
    return Array.from(this.pendingPushQueue.keys());
  }

  subscribePendingPushes(listener: PendingPushListener): Unsubscribe {
    this.pendingPushListeners.add(listener);
    return () => this.pendingPushListeners.delete(listener);
  }

  /** Tenta reenviar tudo que está na fila. Chame isso quando a conexão voltar. */
  async retryPendingPushes(): Promise<void> {
    const entries = Array.from(this.pendingPushQueue.entries());
    for (const [path, record] of entries) {
      try {
        await this.transport.push(this.userId, record);
        this.pendingPushQueue.delete(path);
        this.notifyPendingPushListeners();
      } catch {
        // continua na fila, tenta de novo na próxima chamada
      }
    }
  }

  getConflicts(): ConflictRecord[] {
    return Array.from(this.conflicts.values());
  }

  subscribeConflicts(listener: ConflictListener): Unsubscribe {
    this.conflictListeners.add(listener);
    return () => this.conflictListeners.delete(listener);
  }

  async resolveConflict(path: string, resolution: ConflictResolution): Promise<void> {
    const conflict = this.conflicts.get(path);
    if (!conflict) return;

    if (resolution === 'keep-local') {
      this.pendingLocalEdits.add(path);
      const record: SyncRecord = {
        path,
        value: conflict.localValue,
        updatedAt: new Date().toISOString(),
        deviceId: this.deviceId,
      };
      try {
        await this.transport.push(this.userId, record);
        this.pendingPushQueue.delete(path);
      } catch {
        this.pendingPushQueue.set(path, record);
      }
      this.notifyPendingPushListeners();
      // meta é atualizado pelo self-echo em handleRemoteRecord, não aqui — mesmo motivo do handleLocalChange
    } else {
      await this.applyRemoteDirect({
        path,
        value: conflict.remoteValue,
        updatedAt: conflict.remoteUpdatedAt,
        deviceId: conflict.remoteDeviceId,
      });
    }

    this.conflicts.delete(path);
    this.notifyConflictListeners();
  }

  private async applyRemoteDirect(record: SyncRecord): Promise<void> {
    this.applyingRemote.add(record.path);
    try {
      await this.localStore.set(record.path, record.value);
    } finally {
      this.applyingRemote.delete(record.path);
    }
    this.syncMeta.set(record.path, { lastSyncedValue: record.value, lastSyncedRemoteUpdatedAt: record.updatedAt });
  }

  private async handleRemoteRecord(record: SyncRecord): Promise<void> {
    // eco do próprio device: confirma a sync, não reaplica
    if (record.deviceId === this.deviceId) {
      this.pendingLocalEdits.delete(record.path);
      this.syncMeta.set(record.path, { lastSyncedValue: record.value, lastSyncedRemoteUpdatedAt: record.updatedAt });
      if (this.conflicts.has(record.path)) {
        this.conflicts.delete(record.path);
        this.notifyConflictListeners();
      }
      return;
    }

    const meta = this.syncMeta.get(record.path);
    const currentLocal = await this.localStore.get(record.path);
    // dirty = edição local feita e ainda sem confirmação do próprio eco —
    // se um record de OUTRO device chega nesse meio-tempo, é conflito
    // garantido, mesmo que a comparação de valores abaixo ainda não reflita
    // isso (ela pode estar temporariamente desatualizada por causa da
    // corrida entre pushes concorrentes).
    const localDiverged =
      this.pendingLocalEdits.has(record.path) || (meta !== undefined && !deepEqualJson(currentLocal, meta.lastSyncedValue));

    if (!localDiverged) {
      await this.applyRemoteDirect(record);
      return;
    }

    const conflict: ConflictRecord = {
      path: record.path,
      localValue: currentLocal,
      remoteValue: record.value,
      remoteUpdatedAt: record.updatedAt,
      remoteDeviceId: record.deviceId,
    };
    this.conflicts.set(record.path, conflict);
    this.notifyConflictListeners();
  }

  private async handleLocalChange(path: string, newValue: unknown): Promise<void> {
    // esse set() veio do próprio applyRemoteDirect — não é uma edição genuína do usuário
    if (this.applyingRemote.has(path)) return;

    // marca dirty JÁ (síncrono, antes do push) — isso é o que garante detecção
    // de conflito correta mesmo sob corrida entre pushes concorrentes
    this.pendingLocalEdits.add(path);

    // edição genuína local: se havia um conflito pendente, o usuário acabou de sobrescrever — descarta
    if (this.conflicts.has(path)) {
      this.conflicts.delete(path);
      this.notifyConflictListeners();
    }

    const record: SyncRecord = { path, value: newValue, updatedAt: new Date().toISOString(), deviceId: this.deviceId };
    try {
      await this.transport.push(this.userId, record);
      this.pendingPushQueue.delete(path);
      this.notifyPendingPushListeners();
    } catch {
      // sem rede, backend fora do ar, etc — fica na fila até retryPendingPushes() confirmar.
      // pendingLocalEdits continua marcado como dirty (correto: esse valor ainda não é
      // confirmado por ninguém), então um record remoto concorrente ainda vira conflito.
      this.pendingPushQueue.set(path, record);
      this.notifyPendingPushListeners();
    }
    // NÃO atualiza syncMeta aqui em caso de sucesso — só quando o eco confirmado
    // voltar (self-echo em handleRemoteRecord). Atualizar otimisticamente aqui
    // reabriria a mesma corrida que pendingLocalEdits foi criado pra fechar.
  }

  private notifyConflictListeners(): void {
    const list = this.getConflicts();
    this.conflictListeners.forEach((listener) => listener(list));
  }

  private notifyPendingPushListeners(): void {
    const list = this.getPendingPushPaths();
    this.pendingPushListeners.forEach((listener) => listener(list));
  }
}
