import { useCallback, useEffect, useState } from "react";
import { HardDrive, Sparkles, FolderOpen, RotateCcw, Trash2, Package, RefreshCw, Play } from "lucide-react";

function OptimizerSection({ title, icon: Icon, children, accent }: { title: string; icon: React.ElementType; children: React.ReactNode; accent?: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${accent || "#C00018"}15` }}>
          <Icon size={12} style={{ color: accent || "#C00018" }} />
        </div>
        <span className="text-[10px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
          {title}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-2.5 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
      {children}
    </div>
  );
}

function ActionButton({ onClick, disabled, children, color = "#C00018", title }: { onClick: () => void; disabled?: boolean; children: React.ReactNode; color?: string; title?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all"
      style={{ fontFamily: "'Sora', sans-serif", color: "#fff", background: color, opacity: disabled ? 0.4 : 1 }}
    >
      {children}
    </button>
  );
}

const fmtBytes = (b: number) => {
  if (b >= 1e9) return `${(b / 1e9).toFixed(2)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  if (b >= 1e3) return `${(b / 1e3).toFixed(1)} KB`;
  return `${b} B`;
};

export function OptimizerPanel() {
  const [diskPath, setDiskPath] = useState("");
  const [diskResult, setDiskResult] = useState<OrunDiskUsageScanResult | null>(null);
  const [diskLoading, setDiskLoading] = useState(false);
  const [junkPath, setJunkPath] = useState("");
  const [junkResult, setJunkResult] = useState<OrunJunkScanResult | null>(null);
  const [junkLoading, setJunkLoading] = useState(false);
  const [holding, setHolding] = useState<OrunPendingDeletionEntry[]>([]);
  const [updates, setUpdates] = useState<OrunUpdateCheckResult | null>(null);
  const [updatesLoading, setUpdatesLoading] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const hydrateHolding = useCallback(async () => {
    try {
      setHolding(await window.orun.optimizer.listHolding());
    } catch (err) {
      setError(String(err));
    }
  }, []);

  useEffect(() => {
    hydrateHolding();
  }, [hydrateHolding]);

  const scanDisk = async () => {
    if (!diskPath) return;
    setDiskLoading(true);
    setError(null);
    try {
      setDiskResult(await window.orun.optimizer.scanDiskUsage(diskPath));
    } catch (err) {
      setError(String(err));
    } finally {
      setDiskLoading(false);
    }
  };

  const scanJunk = async () => {
    if (!junkPath) return;
    setJunkLoading(true);
    setError(null);
    try {
      setJunkResult(await window.orun.optimizer.scanJunk({ path: junkPath, isDownloadsFolder: false }));
    } catch (err) {
      setError(String(err));
    } finally {
      setJunkLoading(false);
    }
  };

  const cleanJunk = async () => {
    if (!junkResult?.candidates?.length) return;
    await window.orun.optimizer.moveManyToHolding(junkResult.candidates);
    setJunkResult({ ...junkResult, candidates: [], totalSizeBytes: 0 });
    await hydrateHolding();
  };

  const restoreFromHolding = async (id: string) => {
    await window.orun.optimizer.restoreFromHolding(id);
    await hydrateHolding();
  };

  const deletePermanently = async (id: string) => {
    await window.orun.optimizer.deletePermanently(id);
    await hydrateHolding();
  };

  const checkUpdates = async () => {
    setUpdatesLoading(true);
    setError(null);
    try {
      const result = await window.orun.optimizer.checkUpdates();
      setUpdates(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setUpdatesLoading(false);
    }
  };

  const runUpdate = async (id: string) => {
    setUpdatingIds((prev) => [...prev, id]);
    const result = await window.orun.optimizer.runUpdate(id);
    if (!result.success) setError(result.error ?? `Falha ao atualizar ${id}`);
    setUpdatingIds((prev) => prev.filter((x) => x !== id));
    await checkUpdates();
  };

  return (
    <div>
      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg text-[10px]" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.25)" }}>
          {error}
        </div>
      )}

      <OptimizerSection title="Uso de disco" icon={HardDrive} accent="#C00018">
        <Card>
          <div className="flex items-center gap-2">
            <input
              value={diskPath}
              onChange={(e) => setDiskPath(e.target.value)}
              placeholder="Pasta a analisar (ex: C:\)"
              className="flex-1 px-2.5 py-1.5 rounded-lg text-[10px] outline-none"
              style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            />
            <ActionButton onClick={scanDisk} disabled={diskLoading || !diskPath} color="#C00018">
              {diskLoading ? <RefreshCw size={11} className="animate-spin" /> : <HardDrive size={11} />}
              Analisar
            </ActionButton>
          </div>
          {diskResult && (
            <div className="mt-2 text-[9px]" style={{ color: "var(--muted-foreground)" }}>
              Livre: {fmtBytes(diskResult.freeBytes ?? 0)} de {fmtBytes(diskResult.totalBytes ?? 0)}
              {diskResult.entries?.length ? ` · ${diskResult.entries.length} entradas` : ""}
            </div>
          )}
        </Card>
      </OptimizerSection>

      <OptimizerSection title="Limpeza (junk)" icon={Sparkles} accent="#F59E0B">
        <Card>
          <div className="flex items-center gap-2">
            <input
              value={junkPath}
              onChange={(e) => setJunkPath(e.target.value)}
              placeholder="Pasta para caçar arquivos desnecessários"
              className="flex-1 px-2.5 py-1.5 rounded-lg text-[10px] outline-none"
              style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            />
            <ActionButton onClick={scanJunk} disabled={junkLoading || !junkPath} color="#F59E0B">
              {junkLoading ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
              Escanear
            </ActionButton>
          </div>
          {junkResult?.candidates?.length ? (
            <>
              <div className="mt-2 text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                {junkResult.candidates.length} candidatos · {fmtBytes(junkResult.totalSizeBytes ?? 0)} recuperáveis
              </div>
              <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                {junkResult.candidates.map((c) => (
                  <JunkRow key={c.path} c={c} />
                ))}
              </div>
              <div className="mt-2">
                <ActionButton onClick={cleanJunk} color="#F59E0B">
                  <FolderOpen size={11} /> Mover {junkResult.candidates.length} p/ retenção (7 dias)
                </ActionButton>
              </div>
            </>
          ) : junkResult ? (
            <div className="text-[9px] mt-2" style={{ color: "var(--muted-foreground)" }}>Nenhum arquivo desnecessário encontrado.</div>
          ) : null}
        </Card>
      </OptimizerSection>

      <OptimizerSection title="Retenção (holding)" icon={FolderOpen} accent="#22C55E">
        <Card>
          {holding.length === 0 ? (
            <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>Nada em retenção. Itens limpos ficam 7 dias aqui antes de serem apagados.</div>
          ) : (
            <div className="space-y-1.5">
              {holding.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 text-[9px]" style={{ color: "var(--foreground)" }}>
                  <span className="truncate flex-1">{e.fileName}</span>
                  <span className="shrink-0" style={{ color: "var(--muted-foreground)" }}>{fmtBytes(e.sizeBytes ?? 0)}</span>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => restoreFromHolding(e.id)} title="Restaurar" className="p-1 rounded" style={{ color: "#22C55E" }}>
                      <RotateCcw size={11} />
                    </button>
                    <button onClick={() => deletePermanently(e.id)} title="Apagar definitivamente" className="p-1 rounded" style={{ color: "#EF4444" }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </OptimizerSection>

      <OptimizerSection title="Software desatualizado" icon={Package} accent="#8B5CF6">
        <Card>
          <ActionButton onClick={checkUpdates} disabled={updatesLoading} color="#8B5CF6">
            {updatesLoading ? <RefreshCw size={11} className="animate-spin" /> : <Package size={11} />}
            Verificar atualizações
          </ActionButton>
          {updates?.packages?.length ? (
            <div className="mt-2 space-y-1">
              {updates.packages.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-[9px]" style={{ color: "var(--foreground)" }}>
                  <span className="truncate flex-1">
                    {p.name} <span style={{ color: "var(--muted-foreground)" }}>({p.currentVersion ?? "?"} → {p.latestVersion ?? "?"})</span>
                  </span>
                  <ActionButton onClick={() => runUpdate(p.id)} disabled={updatingIds.includes(p.id)} color="#8B5CF6">
                    <Play size={10} /> Atualizar
                  </ActionButton>
                </div>
              ))}
            </div>
          ) : updates ? (
            <div className="text-[9px] mt-2" style={{ color: "var(--muted-foreground)" }}>Tudo atualizado.</div>
          ) : null}
        </Card>
      </OptimizerSection>

      <div className="text-[8px] pb-2" style={{ color: "var(--muted-foreground)" }}>
        <Sparkles size={9} style={{ display: "inline", marginRight: 3, color: "#F59E0B" }} />
        Orun Optimizer · motor <code>@orun/system-optimizer</code>. Atualizações que exijam elevação (admin/UAC) ficam a cargo da estratégia do SO.
      </div>
    </div>
  );
}

function JunkRow({ c }: { c: OrunJunkCandidate }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[9px]" style={{ color: "var(--foreground)" }}>
      <span className="truncate flex-1">{c.path}</span>
      <span className="shrink-0 px-1.5 py-0.5 rounded text-[8px] uppercase" style={{ background: "var(--background)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
        {c.category || "manual"}
      </span>
    </div>
  );
}
