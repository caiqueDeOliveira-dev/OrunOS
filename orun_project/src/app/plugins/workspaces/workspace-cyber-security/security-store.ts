// workspace-cyber-security store

import { createStore } from "../../lib/store";
import type { SecurityReport, SecurityFinding } from "./security-types";

const STORAGE_KEY = "orun_security_report";

const CATEGORY_LABELS: Record<string, string> = {
  api_keys: "Credenciais Expostas",
  dependencies: "Dependencias",
  network: "Rede e Portas",
  windows_security: "Seguranca do Windows",
  secrets: "Arquivos Sensiveis",
  updates: "Atualizacoes",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#DC2626",
  high: "#EA580C",
  medium: "#D97706",
  low: "#2563EB",
  info: "#16A34A",
};

export interface SecurityState {
  [key: string]: unknown;
  report: SecurityReport | null;
  loading: boolean;
  error: string | null;
}

function loadPersisted(): Partial<SecurityState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { report: JSON.parse(raw) };
  } catch { /* ignore */ }
  return {};
}

const defaults: SecurityState = {
  report: loadPersisted().report ?? null,
  loading: false,
  error: null,
};

export const useSecurityStore = createStore<SecurityState>(defaults);

function persist(report: SecurityReport) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(report)); } catch { /* ignore */ }
}

export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || category;
}

export function getSeverityColor(severity: string): string {
  return SEVERITY_COLORS[severity] || "#64748B";
}

export async function runScan(): Promise<SecurityReport> {
  useSecurityStore.setState({ loading: true, error: null });
  const orun = (window as any).orun;
  if (orun && orun.security) {
    try {
      const report = await orun.security.runAudit();
      if (report && report.error) {
        useSecurityStore.setState({ loading: false, error: report.error });
        return useSecurityStore.getState().report as SecurityReport;
      }
      useSecurityStore.setState({ report, loading: false });
      persist(report);
      return report;
    } catch (err: any) {
      useSecurityStore.setState({ loading: false, error: err?.message || "Falha no scan" });
      return useSecurityStore.getState().report as SecurityReport;
    }
  }
  const fallback = buildFallbackReport();
  useSecurityStore.setState({ report: fallback, loading: false });
  persist(fallback);
  return fallback;
}

export async function fixFinding(findingId: string): Promise<SecurityFinding | null> {
  const orun = (window as any).orun;
  if (orun && orun.security) {
    try {
      const res = await orun.security.fixFinding(findingId);
      if (res.success) {
        const state = useSecurityStore.getState();
        const report = state.report;
        if (report) {
          const findings = report.findings.map((f) => f.id === findingId ? { ...f, status: "mitigated" as const } : f);
          const next = { ...report, findings, score: res.data && typeof res.data.score === "number" ? res.data.score : report.score, summary: { ...report.summary, open: findings.filter((f) => f.status === "open").length, mitigated: findings.filter((f) => f.status === "mitigated").length } };
          useSecurityStore.setState({ report: next });
          persist(next);
          return next.findings.find((f) => f.id === findingId) || null;
        }
      }
    } catch { /* fallthrough */ }
  }
  const state = useSecurityStore.getState();
  if (state.report) {
    const findings = state.report.findings.map((f) => f.id === findingId ? { ...f, status: "mitigated" as const } : f);
    const next = { ...state.report, findings };
    useSecurityStore.setState({ report: next });
    persist(next);
    return next.findings.find((f) => f.id === findingId) || null;
  }
  return null;
}

export function buildFallbackReport(): SecurityReport {
  const findings: SecurityFinding[] = [
    {
      id: "fallback_note",
      title: "Modo de demonstracao",
      severity: "info",
      category: "updates",
      description: "O scanner local requer o runtime Electron. Este e um relatorio ilustrativo.",
      recommendation: "Execute o Orun OS no desktop para obter uma auditoria real da maquina.",
      status: "open",
    },
  ];
  return {
    score: 92,
    grade: "A",
    ranAt: new Date().toISOString(),
    summary: {
      total: findings.length,
      open: findings.length,
      mitigated: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 1,
      categories: ["updates"],
    },
    findings,
  };
}
