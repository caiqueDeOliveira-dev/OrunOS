import { useCallback, useEffect, useState } from "react";
import { Shield as ShieldIcon, Play, Square, ScanSearch, RefreshCw, ShieldAlert, ShieldCheck, FileSearch, Trash2, RotateCcw, FolderLock, Bug } from "lucide-react";

function ShieldSection({ title, icon: Icon, children, accent }: { title: string; icon: React.ElementType; children: React.ReactNode; accent?: string }) {
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

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="px-3 py-2.5 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)", ...style }}>
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
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all disabled:opacity-40"
      style={{ fontFamily: "'Sora', sans-serif", color: "#fff", background: color, opacity: disabled ? 0.4 : 1 }}
    >
      {children}
    </button>
  );
}

const SEVERITY_COLOR: Record<string, string> = {
  info: "#64748b",
  low: "#22C55E",
  medium: "#F59E0B",
  high: "#F97316",
  critical: "#EF4444",
};

function SeverityBadge({ severity }: { severity?: string }) {
  const color = SEVERITY_COLOR[severity || "info"] || "#64748b";
  return (
    <span className="px-1.5 py-0.5 rounded text-[8px] uppercase font-semibold" style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}>
      {severity || "info"}
    </span>
  );
}

export function ShieldPanel() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [findings, setFindings] = useState<OrunThreatFinding[]>([]);
  const [lastScan, setLastScan] = useState<OrunScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [clamAv, setClamAv] = useState<{ available: boolean; version?: string } | null>(null);
  const [quarantine, setQuarantine] = useState<OrunQuarantineEntry[]>([]);
  const [defender, setDefender] = useState<OrunDefenderStatus | null>(null);
  const [defenderBusy, setDefenderBusy] = useState(false);
  const [fileAnalysis, setFileAnalysis] = useState<OrunFileAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [processTree, setProcessTree] = useState<OrunProcessTreeNode[]>([]);
  const [loadingProcesses, setLoadingProcesses] = useState(false);
  const [scanPath, setScanPath] = useState("");
  const [filePath, setFilePath] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hydrate = useCallback(async () => {
    try {
      const [log, entries, dStatus, cStatus] = await Promise.all([
        window.orun.shield.getFindingsLog(),
        window.orun.shield.listQuarantine(),
        window.orun.shield.getDefenderStatus(),
        window.orun.shield.checkClamAvAvailability(),
      ]);
      setFindings([...log].reverse());
      setQuarantine(entries);
      setDefender(dStatus);
      setClamAv(cStatus);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  useEffect(() => {
    hydrate();
    const offThreat = window.orun.shield.onThreatDetected((f) => setFindings((prev) => [f, ...prev]));
    const offScanStart = window.orun.shield.onScanStarted(() => setScanning(true));
    const offScanEnd = window.orun.shield.onScanFinished((r) => { setScanning(false); setLastScan(r); });
    const offErr = window.orun.shield.onError((p) => setError(`${p.source}: ${p.message}`));
    return () => { offThreat(); offScanStart(); offScanEnd(); offErr(); };
  }, [hydrate]);

  const toggleMonitoring = async () => {
    if (isMonitoring) { await window.orun.shield.stopMonitoring(); } else { await window.orun.shield.startMonitoring(); }
    setIsMonitoring(!isMonitoring);
  };

  const runScan = async () => {
    if (!scanPath) return;
    setScanning(true);
    setError(null);
    try {
      const result = await window.orun.shield.fullScan({ targetPath: scanPath, recursive: true });
      if (result.clamav) setLastScan(result.clamav);
      if (result.yara?.length) setFindings((prev) => [...result.yara!, ...prev]);
      await hydrate();
    } catch (err) {
      setError(String(err));
    } finally {
      setScanning(false);
    }
  };

  const analyzeFile = async () => {
    if (!filePath) return;
    setAnalyzing(true);
    setError(null);
    try {
      const result = await window.orun.shield.analyzeFile(filePath);
      setFileAnalysis(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setAnalyzing(false);
    }
  };

  const loadProcessTree = async () => {
    setLoadingProcesses(true);
    try {
      setProcessTree(await window.orun.shield.getProcessTree());
    } catch (err) {
      setError(String(err));
    } finally {
      setLoadingProcesses(false);
    }
  };

  const quarantineFinding = async (f: OrunThreatFinding) => {
    const result = await window.orun.shield.quarantineFinding(f);
    if (result.success) {
      setFindings((prev) => prev.filter((x) => x.id !== f.id));
      setQuarantine(await window.orun.shield.listQuarantine());
    } else {
      setError(result.error ?? "Falha ao colocar em quarentena.");
    }
  };

  const restoreQuarantine = async (id: string) => {
    await window.orun.shield.restoreQuarantine(id);
    setQuarantine(await window.orun.shield.listQuarantine());
  };

  const deleteQuarantine = async (id: string) => {
    await window.orun.shield.deleteQuarantine(id);
    setQuarantine(await window.orun.shield.listQuarantine());
  };

  const defenderQuickScan = async () => {
    setDefenderBusy(true);
    const result = await window.orun.shield.runDefenderQuickScan();
    if (!result.success) setError(result.error ?? "Falha no scan rápido do Defender.");
    await hydrate();
    setDefenderBusy(false);
  };

  const updateDefenderSignatures = async () => {
    setDefenderBusy(true);
    const result = await window.orun.shield.updateDefenderSignatures();
    if (!result.updated) setError(result.error ?? "Falha ao atualizar assinaturas do Defender.");
    await hydrate();
    setDefenderBusy(false);
  };

  const renderProcessTree = (nodes: OrunProcessTreeNode[], depth = 0) => (
    <div style={{ marginLeft: depth ? 14 : 0, borderLeft: depth ? "1px solid var(--border)" : undefined, paddingLeft: depth ? 8 : 0 }}>
      {nodes.map((n) => (
        <div key={n.pid} className="py-0.5 text-[9px]" style={{ color: "var(--muted-foreground)" }}>
          <span style={{ color: "var(--foreground)" }}>{n.name}</span>{" "}
          <span>PID {n.pid}</span>
          {typeof n.cpuPercent === "number" && <span> · {n.cpuPercent.toFixed(1)}% CPU</span>}
          {n.children?.length ? renderProcessTree(n.children, depth + 1) : null}
        </div>
      ))}
    </div>
  );

  return (
    <div>
      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg text-[10px]" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.25)" }}>
          {error}
        </div>
      )}

      <ShieldSection title="Monitoramento Sentinela" icon={ShieldIcon} accent="#C00018">
        <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="text-[11px]" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
              {isMonitoring ? "Monitoramento ATIVO" : "Monitoramento DESLIGADO"}
            </div>
            <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
              Processos, rede, integridade de arquivos e heurística anti-ransomware.
            </div>
          </div>
          <ActionButton onClick={toggleMonitoring} color={isMonitoring ? "#7f1d1d" : "#C00018"}>
            {isMonitoring ? <Square size={11} /> : <Play size={11} />}
            {isMonitoring ? "Parar" : "Ativar"}
          </ActionButton>
        </Card>
      </ShieldSection>

      <ShieldSection title="Windows Defender" icon={ShieldCheck} accent="#22C55E">
        <Card>
          <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
            {defender?.available === false
              ? "Defender não disponível."
              : defender?.realtimeProtection
                ? "Proteção em tempo real: LIGADA"
                : "Proteção em tempo real: DESLIGADA"}
            {defender?.signatureAgeDays !== undefined && (
              <span> · Assinaturas: {defender.signatureAgeDays} dia(s)</span>
            )}
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            <ActionButton onClick={defenderQuickScan} disabled={defenderBusy} color="#22C55E">
              <ScanSearch size={11} /> Scan rápido
            </ActionButton>
            <ActionButton onClick={updateDefenderSignatures} disabled={defenderBusy} color="#22C55E">
              <RefreshCw size={11} /> Atualizar assinaturas
            </ActionButton>
            <ActionButton onClick={async () => { await window.orun.shield.syncDefenderThreats(); await hydrate(); }} color="#22C55E">
              <ShieldAlert size={11} /> Sincronizar ameaças
            </ActionButton>
          </div>
        </Card>
      </ShieldSection>

      <ShieldSection title="Escaneamento" icon={ScanSearch} accent="#F59E0B">
        <Card>
          <div className="flex items-center gap-2">
            <input
              value={scanPath}
              onChange={(e) => setScanPath(e.target.value)}
              placeholder="Caminho a escanear (ex: C:\Users\Voce)"
              className="flex-1 px-2.5 py-1.5 rounded-lg text-[10px] outline-none"
              style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            />
            <ActionButton onClick={runScan} disabled={scanning || !scanPath} color="#F59E0B">
              {scanning ? <RefreshCw size={11} className="animate-spin" /> : <Play size={11} />}
              Escanear
            </ActionButton>
          </div>
          <div className="text-[9px] mt-2" style={{ color: "var(--muted-foreground)" }}>
            {lastScan
              ? `Último scan: ${lastScan.filesScanned ?? 0} arquivos · ${lastScan.findings?.length ?? 0} ameaças · engine ${lastScan.engine || "—"}`
              : "Nenhum scan realizado ainda."}
            {clamAv && !clamAv.available && " · ClamAV não encontrado no sistema (opcional)."}
          </div>
          {lastScan?.findings?.length ? (
            <div className="mt-2 space-y-1">
              {lastScan.findings.map((f) => (
                <FindingRow key={f.id} f={f} onQuarantine={quarantineFinding} />
              ))}
            </div>
          ) : null}
        </Card>
      </ShieldSection>

      <ShieldSection title="Análise de arquivo" icon={FileSearch} accent="#3B82F6">
        <Card>
          <div className="flex items-center gap-2">
            <input
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="Caminho do arquivo (hash, entropia, strings suspeitas)"
              className="flex-1 px-2.5 py-1.5 rounded-lg text-[10px] outline-none"
              style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            />
            <ActionButton onClick={analyzeFile} disabled={analyzing || !filePath} color="#3B82F6">
              {analyzing ? <RefreshCw size={11} className="animate-spin" /> : <FileSearch size={11} />}
              Analisar
            </ActionButton>
          </div>
          {fileAnalysis && (
            <div className="mt-2 text-[9px]" style={{ color: "var(--muted-foreground)" }}>
              SHA-256: <code>{fileAnalysis.sha256 ?? "—"}</code> · Entropia: {fileAnalysis.entropy?.toFixed(3) ?? "—"} · Tamanho: {fileAnalysis.sizeBytes ?? "—"} B
              {fileAnalysis.suspiciousStrings?.length ? (
                <div className="mt-1">Strings suspeitas: {fileAnalysis.suspiciousStrings.join(", ")}</div>
              ) : null}
            </div>
          )}
        </Card>
      </ShieldSection>

      <ShieldSection title="Processos" icon={Bug} accent="#8B5CF6">
        <Card>
          <ActionButton onClick={loadProcessTree} disabled={loadingProcesses} color="#8B5CF6">
            {loadingProcesses ? <RefreshCw size={11} className="animate-spin" /> : <Bug size={11} />}
            Carregar árvore de processos
          </ActionButton>
          {processTree.length ? <div className="mt-2 max-h-48 overflow-y-auto">{renderProcessTree(processTree)}</div> : null}
        </Card>
      </ShieldSection>

      {findings.length > 0 && (
        <ShieldSection title="Ameaças detectadas" icon={ShieldAlert} accent="#EF4444">
          <div className="space-y-2">
            {findings.map((f) => (
              <FindingRow key={f.id} f={f} onQuarantine={quarantineFinding} />
            ))}
          </div>
        </ShieldSection>
      )}

      <ShieldSection title="Quarentena" icon={FolderLock} accent="#F97316">
        <Card>
          {quarantine.length === 0 ? (
            <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>Nenhum item em quarentena.</div>
          ) : (
            <div className="space-y-1.5">
              {quarantine.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 text-[9px]" style={{ color: "var(--foreground)" }}>
                  <span className="truncate flex-1">{e.fileName}</span>
                  <span className="shrink-0" style={{ color: "var(--muted-foreground)" }}>
                    {(e.sizeBytes ?? 0) / 1024 > 0 ? `${((e.sizeBytes ?? 0) / 1024).toFixed(1)} KB` : "—"}
                  </span>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => restoreQuarantine(e.id)} title="Restaurar" className="p-1 rounded" style={{ color: "#22C55E" }}>
                      <RotateCcw size={11} />
                    </button>
                    <button onClick={() => deleteQuarantine(e.id)} title="Apagar definitivamente" className="p-1 rounded" style={{ color: "#EF4444" }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </ShieldSection>

      <div className="text-[8px] pb-2" style={{ color: "var(--muted-foreground)" }}>
        <ShieldIcon size={9} style={{ display: "inline", marginRight: 3, color: "#C00018" }} />
        Orun Shield · motor <code>@orun/shield-core</code> (ClamAV, YARA, Sentinel, Defender). Bloqueio automático e auto-quarentena permanecem desligados até confirmação na UI.
      </div>
    </div>
  );
}

function FindingRow({ f, onQuarantine }: { f: OrunThreatFinding; onQuarantine: (f: OrunThreatFinding) => void }) {
  return (
    <div className="px-3 py-2 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <SeverityBadge severity={f.severity} />
            <span className="text-[10px] truncate" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{f.title || "Ameaça"}</span>
          </div>
          <div className="text-[8px] mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>
            {f.filePath || f.processName || f.remoteAddress || f.source || ""}
            {f.sha256 ? ` · ${f.sha256.slice(0, 12)}…` : ""}
          </div>
        </div>
        {f.filePath && (
          <ActionButton onClick={() => onQuarantine(f)} color="#EF4444">
            <FolderLock size={11} /> Quarentena
          </ActionButton>
        )}
      </div>
    </div>
  );
}
