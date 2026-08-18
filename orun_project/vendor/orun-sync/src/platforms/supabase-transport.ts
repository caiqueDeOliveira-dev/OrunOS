import type { SyncRecord, SyncTransport, Unsubscribe } from '../types';

// Tipos mínimos de @supabase/supabase-js, pra este arquivo poder ser
// typechecked sem depender do pacote instalado aqui isoladamente. No
// monorepo real, trocar por:
//   import type { SupabaseClient } from '@supabase/supabase-js';
interface SupabaseQueryResult<T> {
  data: T | null;
  error: { message: string } | null;
}
interface SupabaseClientLike {
  from(table: string): {
    select(columns: string): { eq(col: string, val: string): Promise<SupabaseQueryResult<any[]>> };
    upsert(row: Record<string, unknown>, opts: { onConflict: string }): Promise<SupabaseQueryResult<null>>;
  };
  channel(name: string): {
    on(
      event: 'postgres_changes',
      filter: { event: string; schema: string; table: string; filter?: string },
      callback: (payload: { new: Record<string, unknown> }) => void
    ): { subscribe(): { unsubscribe(): void } };
  };
}

const TABLE_NAME = 'orun_settings_sync';

/**
 * @orun/sync — SupabaseSyncTransport
 *
 * Tabela esperada (mesma instância Supabase do @orun/identity):
 *
 *   create table orun_settings_sync (
 *     user_id uuid not null references auth.users(id),
 *     path text not null,
 *     value jsonb not null,
 *     updated_at timestamptz not null default now(),
 *     device_id text not null,
 *     primary key (user_id, path)
 *   );
 *   alter publication supabase_realtime add table orun_settings_sync;
 *
 * RLS deve restringir cada linha ao próprio user_id (auth.uid() = user_id),
 * seguindo o mesmo padrão multi-tenant do @orun/identity.
 */
export class SupabaseSyncTransport implements SyncTransport {
  constructor(private readonly client: SupabaseClientLike) {}

  async pullAll(userId: string): Promise<SyncRecord[]> {
    const { data, error } = await this.client.from(TABLE_NAME).select('path, value, updated_at, device_id').eq('user_id', userId);
    if (error) {
      throw new Error(`[@orun/sync] Falha ao buscar estado remoto: ${error.message}`);
    }
    return (data ?? []).map((row: any) => ({
      path: row.path,
      value: row.value,
      updatedAt: row.updated_at,
      deviceId: row.device_id,
    }));
  }

  async push(userId: string, record: SyncRecord): Promise<void> {
    const { error } = await this.client.from(TABLE_NAME).upsert(
      {
        user_id: userId,
        path: record.path,
        value: record.value,
        updated_at: record.updatedAt,
        device_id: record.deviceId,
      },
      { onConflict: 'user_id,path' }
    );
    if (error) {
      throw new Error(`[@orun/sync] Falha ao enviar mudança pro Supabase: ${error.message}`);
    }
  }

  subscribe(userId: string, onChange: (record: SyncRecord) => void): Unsubscribe {
    const channel = this.client
      .channel(`settings-sync-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLE_NAME, filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new;
          if (!row?.path) return; // DELETE não tem `new` — settings sync não deleta linhas, ignora
          onChange({
            path: row.path as string,
            value: row.value,
            updatedAt: row.updated_at as string,
            deviceId: row.device_id as string,
          });
        }
      )
      .subscribe();

    return () => channel.unsubscribe();
  }
}
