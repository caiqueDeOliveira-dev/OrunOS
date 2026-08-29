// workspace-shield-secrets / ShieldSecretsPanel.tsx
// Gitleaks credential leak detection dashboard.

import { useState, useEffect, useCallback } from "react";
import {
  KeyRound, RefreshCw, Search, ShieldAlert, CheckCircle2, Trash2, Plus,
  type LucideIcon,
} from "lucide-react";
import { P, PremiumRoot, ScrollArea, Card, StatCard, SectionHeader, Badge, PrimaryButton, GhostButton, Input } from "../premium";
import type { WorkspaceProps } from "../../types";

// ── Types ─────────────────────────────────────────────────────────────

interface Finding {
  id: string;
  file: string;
  line: string;
  column: number;
  match: string;
  ruleId: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  entropy?: number;
  tags?: string[];
}

interface ScanResult {
  findings: Finding[];
  scanPath: string;
  scannedAt: string;
  durationMs: number;
  filesScanned: number;
}

interface AllowlistEntry {
  id: string;
  ruleId?: string;
  file?: string;
  description: string;
}

// ── Helpers ───────────────────────────────────────────────────────────

const SEVERITY_TONE: Record<string, "err" | "warn" | "info" | "neutral"> = {
  critical: "err",
  high: "warn",
  medium: "info",
  low: "neutral",
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: P.error,
  high: P.alert,
  medium: P.info,
  low: P.sub,
};

// ── FindingCard ───────────────────────────────────────────────────────

function FindingCard({ finding }: { finding: Finding }) {
  const tone = SEVERITY_TONE[finding.severity] ?? "neutral";
  const color = SEVERITY_COLORS[finding.severity] ?? P.sub;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${color}1a` }}
          >
            <ShieldAlert size={15} color={color} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone={tone}>{SEVERITY_LABELS[finding.severity]}</Badge>
              <span
                className="text-[9px] font-medium px-2 py-0.5 rounded-md"
                style={{ background: P.card2, color: P.sub }}
              >
                {finding.ruleId}
              </span>
            </div>
            <p
              className="text-[10px] mt-1.5 truncate"
              style={{ color: P.sub }}
            >
              {finding.file}
              {finding.line ? `:${finding.line}` : ""}
            </p>
            <p
              className="text-[10px] mt-1 font-mono leading-relaxed break-all"
              style={{ color: P.text }}
            >
              {finding.match}
            </p>
            {finding.description && (
              <p className="text-[9px] mt-1" style={{ color: P.dim }}>
                {finding.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────

export function ShieldSecretsPanel(_props: WorkspaceProps) {
  const [gitleaksAvailable, setGitleaksAvailable] = useState<boolean | null>(null);
  const [scanPath, setScanPath] = useState(".");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [allowlist, setAllowlist] = useState<AllowlistEntry[]>([]);
  const [allowlistLoading, setAllowlistLoading] = useState(false);

  // ── Check Gitleaks availability on mount ──────────────────────────

  const checkAvailability = useCallback(async () => {
    try {
      const ok = await window.orun?.shieldSecrets?.isAvailable();
      setGitleaksAvailable(!!ok);
    } catch {
      setGitleaksAvailable(false);
    }
  }, []);

  const loadAllowlist = useCallback(async () => {
    setAllowlistLoading(true);
    try {
      const entries = await window.orun?.shieldSecrets?.allowlist?.list();
      setAllowlist(Array.isArray(entries) ? entries : []);
    } catch {
      setAllowlist([]);
    } finally {
      setAllowlistLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAvailability();
    loadAllowlist();
  }, [checkAvailability, loadAllowlist]);

  // ── Scan handler ──────────────────────────────────────────────────

  const runScan = useCallback(async () => {
    if (!scanPath.trim()) return;
    setScanning(true);
    setError(null);
    setResult(null);
    try {
      const res = await window.orun?.shieldSecrets?.scan({
        path: scanPath.trim(),
        kind: "working_tree",
      });
      if (res && typeof res === "object" && "error" in res) {
        setError(String((res as { error: unknown }).error));
      } else {
        setResult(res as ScanResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }, [scanPath]);

  // ── Allowlist remove handler ──────────────────────────────────────

  const removeFromAllowlist = useCallback(
    async (id: string) => {
      try {
        await window.orun?.shieldSecrets?.allowlist?.remove(id);
        setAllowlist((prev) => prev.filter((e) => e.id !== id));
      } catch {
        // silently ignore — entry may already be gone
      }
    },
    [],
  );

  // ── Derived stats ─────────────────────────────────────────────────

  const findings = result?.findings ?? [];
  const severityCounts = findings.reduce(
    (acc, f) => {
      acc[f.severity] = (acc[f.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <PremiumRoot>
      <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: `linear-gradient(135deg, ${P.alert}, ${P.error})`,
              boxShadow: "0 0 16px rgba(255,181,71,0.2)",
            }}
          >
            <KeyRound size={18} color="#fff" />
          </div>
          <div className="min-w-0">
            <h2
              className="text-[15px] font-semibold truncate"
              style={{ fontFamily: "'Sora', sans-serif", color: P.text }}
            >
              Shield Secrets
            </h2>
            <p className="text-[10px]" style={{ color: P.sub }}>
              Detecção de vazamento de credenciais
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {gitleaksAvailable === null ? (
            <Badge tone="info">Verificando...</Badge>
          ) : gitleaksAvailable ? (
            <Badge tone="ok">Gitleaks OK</Badge>
          ) : (
            <Badge tone="err">Gitleaks indisponível</Badge>
          )}
        </div>
      </div>

      <ScrollArea>
        <div className="px-6 pb-6 space-y-6">

          {/* ── Status cards ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={ShieldAlert}
              label="Total"
              value={String(findings.length)}
              status={findings.length > 0 ? "Achados" : "Limpo"}
              tone={findings.length > 0 ? "warn" : "ok"}
            />
            <StatCard
              icon={ShieldAlert}
              label="Críticos"
              value={String(severityCounts["critical"] ?? 0)}
              tone={(severityCounts["critical"] ?? 0) > 0 ? "err" : "ok"}
            />
            <StatCard
              icon={ShieldAlert}
              label="Altos"
              value={String(severityCounts["high"] ?? 0)}
              tone={(severityCounts["high"] ?? 0) > 0 ? "warn" : "ok"}
            />
            <StatCard
              icon={CheckCircle2}
              label="Allowlist"
              value={String(allowlist.length)}
              status={`${allowlist.length} regras`}
              tone="neutral"
            />
          </div>

          {/* ── Scan section ─────────────────────────────────────── */}
          <Card className="p-4">
            <SectionHeader icon={Search} title="Scan de repositório" />
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  value={scanPath}
                  onChange={setScanPath}
                  placeholder="Caminho do diretório (ex: ./ ou C:\repo)"
                />
              </div>
              <PrimaryButton onClick={runScan} disabled={scanning || !gitleaksAvailable}>
                <RefreshCw size={13} className={scanning ? "animate-spin" : ""} />
                {scanning ? "Escaneando..." : "Scan"}
              </PrimaryButton>
            </div>
            {result && (
              <p className="text-[9px] mt-2" style={{ color: P.dim }}>
                {result.filesScanned} arquivos escaneados em{" "}
                {result.durationMs}ms — {result.scanPath}
              </p>
            )}
          </Card>

          {/* ── Error ────────────────────────────────────────────── */}
          {error && (
            <div
              className="p-3 rounded-xl text-[10px]"
              style={{
                background: "rgba(255,75,75,0.1)",
                color: P.error,
                border: "1px solid rgba(255,75,75,0.25)",
              }}
            >
              {error}
            </div>
          )}

          {/* ── Results grid ─────────────────────────────────────── */}
          {findings.length > 0 && (
            <div>
              <SectionHeader icon={ShieldAlert} title="Achados" />
              <div className="grid gap-2">
                {findings.map((f, i) => (
                  <FindingCard key={`${f.ruleId}-${f.file}-${i}`} finding={f} />
                ))}
              </div>
            </div>
          )}

          {result && findings.length === 0 && (
            <Card className="p-12 flex flex-col items-center gap-2 text-center">
              <CheckCircle2 size={32} style={{ color: P.success, opacity: 0.5 }} />
              <p className="text-xs font-medium" style={{ color: P.text }}>
                Nenhuma credencial detectada
              </p>
              <p className="text-[9px]" style={{ color: P.sub }}>
                O repositório analisado está limpo
              </p>
            </Card>
          )}

          {/* ── Allowlist section ────────────────────────────────── */}
          <div>
            <SectionHeader
              icon={KeyRound}
              title="Allowlist"
              right={
                <span className="text-[9px]" style={{ color: P.dim }}>
                  {allowlistLoading ? "Carregando..." : `${allowlist.length} entradas`}
                </span>
              }
            />
            {allowlist.length === 0 && !allowlistLoading ? (
              <Card className="p-8 flex flex-col items-center gap-2 text-center">
                <CheckCircle2 size={24} style={{ color: P.success, opacity: 0.4 }} />
                <p className="text-[10px]" style={{ color: P.sub }}>
                  Nenhuma regra na allowlist
                </p>
              </Card>
            ) : (
              <div className="grid gap-2">
                {allowlist.map((entry) => (
                  <Card key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {entry.ruleId && (
                          <span
                            className="text-[9px] font-medium px-2 py-0.5 rounded-md"
                            style={{ background: P.card2, color: P.sub }}
                          >
                            {entry.ruleId}
                          </span>
                        )}
                        {entry.file && (
                          <span className="text-[9px] truncate" style={{ color: P.dim }}>
                            {entry.file}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] mt-1" style={{ color: P.text }}>
                        {entry.description}
                      </p>
                    </div>
                    <GhostButton
                      onClick={() => removeFromAllowlist(entry.id)}
                      className="!px-2.5 !py-1.5"
                    >
                      <Trash2 size={12} color={P.error} />
                    </GhostButton>
                  </Card>
                ))}
              </div>
            )}
          </div>

        </div>
      </ScrollArea>
    </PremiumRoot>
  );
}
