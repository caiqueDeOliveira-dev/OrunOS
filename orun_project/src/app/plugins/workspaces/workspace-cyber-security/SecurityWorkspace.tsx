// workspace-cyber-security / SecurityWorkspace.tsx
// Local security audit dashboard.

import { useState, useEffect, useMemo } from "react";
import {
  Shield, ShieldCheck, AlertTriangle, RefreshCw, Download, CheckCircle2,
  KeyRound, Boxes, Network, MonitorCheck, FileKey, RefreshCcw, Bug, Info,
  ShieldAlert, CheckCircle, type LucideIcon,
} from "lucide-react";
import type { WorkspaceProps } from "../../types";
import { AIFloatingPrompt } from "../../components/AIFloatingPrompt";
import { useSecurityStore, runScan, fixFinding, getCategoryLabel } from "./security-store";
import type { SecurityFinding, FindingSeverity } from "./security-types";
import { P, PremiumRoot, ScrollArea } from "../premium";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  api_keys: KeyRound,
  dependencies: Boxes,
  network: Network,
  windows_security: MonitorCheck,
  secrets: FileKey,
  updates: RefreshCcw,
};

const SEVERITY_ICONS: Record<FindingSeverity, LucideIcon> = {
  critical: ShieldAlert,
  high: AlertTriangle,
  medium: AlertTriangle,
  low: Bug,
  info: Info,
};

const SEVERITY_LABELS: Record<FindingSeverity, string> = {
  critical: "Critico",
  high: "Alto",
  medium: "Medio",
  low: "Baixo",
  info: "Informativo",
};

function cardStyle(): React.CSSProperties {
  return { padding: "16px", borderRadius: "18px", background: P.card, border: `1px solid ${P.border}` };
}

function severityColor(severity: FindingSeverity): string {
  if (severity === "critical") return P.error;
  if (severity === "high" || severity === "medium") return P.alert;
  if (severity === "low") return P.info;
  return P.success;
}

function scoreColor(score: number): string {
  if (score >= 90) return P.success;
  if (score >= 75) return P.success;
  if (score >= 55) return P.alert;
  if (score >= 35) return P.alert;
  return P.error;
}

function FindingCard({ finding }: { finding: SecurityFinding }) {
  const [busy, setBusy] = useState(false);
  const Icon = SEVERITY_ICONS[finding.severity] || Info;
  const color = severityColor(finding.severity);
  const mitigated = finding.status === "mitigated";

  const mitigate = async () => {
    setBusy(true);
    try { await fixFinding(finding.id); } finally { setBusy(false); }
  };

  return (
    <div className="p-4 rounded-[18px] transition-all hover:scale-[1.01]" style={{ ...cardStyle(), border: `1px solid ${mitigated ? "rgba(0,210,106,0.25)" : `${color}33`}` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}1a` }}>
            <Icon size={15} color={mitigated ? P.success : color} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-medium" style={{ fontFamily: "'Sora', sans-serif", color: P.text }}>{finding.title}</span>
              <span className="text-[8px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider" style={{ background: `${color}1a`, color: mitigated ? P.success : color }}>
                {mitigated ? "Mitigado" : SEVERITY_LABELS[finding.severity]}
              </span>
            </div>
            <p className="text-[9px] mt-1" style={{ color: P.sub }}>
              {getCategoryLabel(finding.category)}
              {finding.file ? ` · ${finding.file}` : ""}
            </p>
            <p className="text-[10px] mt-1.5 leading-relaxed" style={{ color: P.sub }}>{finding.description}</p>
            <div className="mt-2 flex items-start gap-1.5">
              <CheckCircle2 size={12} style={{ color: P.success, marginTop: 2, flexShrink: 0 }} />
              <p className="text-[10px] leading-relaxed" style={{ color: P.text }}>{finding.recommendation}</p>
            </div>
          </div>
        </div>
        {!mitigated && (
          <button
            onClick={mitigate}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-medium shrink-0 transition-all hover:scale-[1.03]"
            style={{ background: P.success, color: "#fff", opacity: busy ? 0.5 : 1 }}
          >
            <CheckCircle size={11} /> Marcar
          </button>
        )}
      </div>
    </div>
  );
}

export function SecurityWorkspace({ onSendMessage }: WorkspaceProps) {
  const report = useSecurityStore((s) => s.report);
  const loading = useSecurityStore((s) => s.loading);
  const error = useSecurityStore((s) => s.error);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showMitigated, setShowMitigated] = useState(false);

  useEffect(() => {
    if (!report) runScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!report) return [];
    return report.findings.filter((f) => {
      if (!showMitigated && f.status === "mitigated") return false;
      if (activeCategory !== "all" && f.category !== activeCategory) return false;
      return true;
    });
  }, [report, activeCategory, showMitigated]);

  const categories = useMemo(() => {
    if (!report) return [];
    const counts: Record<string, number> = {};
    report.findings.forEach((f) => { if (f.status === "open") counts[f.category] = (counts[f.category] || 0) + 1; });
    return Object.entries(counts);
  }, [report]);

  const exportJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-report-${report.ranAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const score = report?.score ?? 0;
  const color = scoreColor(score);
  const summary = report?.summary;

  return (
    <PremiumRoot className="relative">
      <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${P.error}, ${P.violet})`, boxShadow: "0 0 16px rgba(255,75,75,0.2)" }}>
            <Shield size={18} color="#fff" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold truncate" style={{ fontFamily: "'Sora', sans-serif", color: P.text }}>Cyber Security — Auditoria Local</h2>
            <p className="text-[10px]" style={{ color: P.sub }}>
              {report ? `Ultima auditoria: ${new Date(report.ranAt).toLocaleString("pt-BR")}` : "Nenhuma auditoria realizada"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => runScan()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-medium tracking-wider uppercase transition-all hover:scale-[1.03] hover:brightness-110"
            style={{ background: P.error, color: "#fff", opacity: loading ? 0.6 : 1 }}
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> {loading ? "Escaneando..." : "Novo Scan"}
          </button>
          <button
            onClick={exportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-medium tracking-wider uppercase transition-all hover:scale-[1.03]"
            style={{ background: P.card, color: P.sub, border: `1px solid ${P.border}` }}
          >
            <Download size={11} /> Exportar
          </button>
        </div>
      </div>

      <ScrollArea>
      <div className="px-6 pb-6 space-y-6">
      {error && (
        <div className="p-3 rounded-xl text-[10px]" style={{ background: "rgba(255,75,75,0.1)", color: P.error, border: "1px solid rgba(255,75,75,0.25)" }}>
          {error}
        </div>
      )}

      {!report && !loading && (
        <div className="p-12 rounded-[18px] flex flex-col items-center gap-3" style={{ ...cardStyle(), borderStyle: "dashed", background: P.card }}>
          <ShieldCheck size={36} style={{ color: P.success, opacity: 0.5 }} />
          <p className="text-xs" style={{ color: P.sub }}>Clique em "Novo Scan" para auditar esta maquina</p>
        </div>
      )}

      {report && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-4" style={cardStyle()}>
              <div className="relative w-20 h-20 rounded-full flex items-center justify-center shrink-0" style={{ background: `conic-gradient(${color} ${score}%, rgba(255,255,255,0.06) 0)` }}>
                <div className="absolute inset-[6px] rounded-full flex items-center justify-center" style={{ background: P.card }}>
                  <div className="text-center">
                    <p className="text-lg font-bold leading-none" style={{ fontFamily: "'Sora', sans-serif", color }}>{score}</p>
                    <p className="text-[8px] mt-0.5" style={{ color: P.sub }}>de 100</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: P.text }}>Score de Seguranca</p>
                <p className="text-[9px] mt-1" style={{ color: P.sub }}>
                  Nota {report.grade} · {summary?.open} achado(s) aberto(s)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:col-span-2">
              {[
                { label: "Criticos", value: summary?.critical ?? 0, color: P.error, icon: ShieldAlert },
                { label: "Altos", value: summary?.high ?? 0, color: P.alert, icon: AlertTriangle },
                { label: "Medios", value: summary?.medium ?? 0, color: P.alert, icon: AlertTriangle },
                { label: "Mitigados", value: summary?.mitigated ?? 0, color: P.success, icon: CheckCircle },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="flex items-center gap-3" style={cardStyle()}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}1a` }}>
                      <Icon size={15} color={s.color} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-none" style={{ fontFamily: "'Sora', sans-serif", color: P.text }}>{s.value}</p>
                      <p className="text-[9px] mt-1" style={{ color: P.sub }}>{s.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCategory("all")}
                className="px-3 py-1.5 rounded-lg text-[9px] font-medium tracking-wider uppercase transition-all hover:scale-[1.02]"
                style={{ background: activeCategory === "all" ? P.error : P.card, color: activeCategory === "all" ? "#fff" : P.sub, border: `1px solid ${P.border}` }}
              >
                Todos ({summary?.open ?? 0})
              </button>
              {categories.map(([cat, count]) => {
                const Icon = CATEGORY_ICONS[cat] || Shield;
                const active = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(active ? "all" : cat)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-medium transition-all hover:scale-[1.02]"
                    style={{ background: active ? P.error : P.card, color: active ? "#fff" : P.sub, border: `1px solid ${P.border}` }}
                  >
                    <Icon size={11} /> {getCategoryLabel(cat)} ({count})
                  </button>
                );
              })}
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] cursor-pointer" style={{ background: P.card, color: P.sub, border: `1px solid ${P.border}` }}>
                <input type="checkbox" checked={showMitigated} onChange={(e) => setShowMitigated(e.target.checked)} style={{ accentColor: P.success }} />
                Mostrar mitigados
              </label>
            </div>
          )}

          <div className="grid gap-2">
            {filtered.length === 0 && (
              <div className="p-12 rounded-[18px] flex flex-col items-center gap-2 text-center" style={{ ...cardStyle(), borderStyle: "dashed", background: P.card }}>
                <ShieldCheck size={32} style={{ color: P.success, opacity: 0.5 }} />
                <p className="text-xs font-medium" style={{ color: P.text }}>Nenhum achado nesta visualizacao</p>
                <p className="text-[9px]" style={{ color: P.sub }}>Sua configuracao esta segura neste aspecto</p>
              </div>
            )}
            {filtered.map((finding) => <FindingCard key={finding.id} finding={finding} />)}
          </div>
        </>
      )}
      </div>
      </ScrollArea>

      <AIFloatingPrompt onSendMessage={onSendMessage} label="Perguntar sobre seguranca" />
    </PremiumRoot>
  );
}
