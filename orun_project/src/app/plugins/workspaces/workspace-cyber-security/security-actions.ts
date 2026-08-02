// workspace-cyber-security actions — consumidas pelo agente "Cyber Security" via workspace_action

import { registerWorkspaceActions, unregisterWorkspaceActions } from "../../lib/workspace-actions";
import { useSecurityStore, runScan, fixFinding } from "./security-store";

const WORKSPACE_ID = "cyber-security";
let registered = false;

const actions = {
  async run_scan() {
    const report = await runScan();
    if (!report) return { success: false, error: "Scan falhou" };
    return {
      success: true,
      data: report,
      message: `Scan concluido: pontuacao ${report.score}/100 (${report.grade}), ${report.summary.open} achados abertos`,
    };
  },

  async get_report() {
    const report = useSecurityStore.getState().report;
    if (!report) return { success: false, error: "Nenhum relatorio ainda. Rode run_scan primeiro." };
    return { success: true, data: report };
  },

  async get_summary() {
    const report = useSecurityStore.getState().report;
    if (!report) return { success: true, data: null, message: "Nenhuma auditoria realizada ainda" };
    return { success: true, data: report.summary, message: `Score ${report.score} (${report.grade})` };
  },

  async list_findings(params: Record<string, unknown>) {
    const report = useSecurityStore.getState().report;
    if (!report) return { success: false, error: "Nenhum relatorio ainda. Rode run_scan primeiro." };
    const severityFilter = params?.severity ? String(params.severity).toLowerCase() : "";
    const categoryFilter = params?.category ? String(params.category).toLowerCase() : "";
    const statusFilter = params?.status ? String(params.status).toLowerCase() : "";
    let findings = report.findings;
    if (severityFilter) findings = findings.filter((f) => f.severity === severityFilter);
    if (categoryFilter) findings = findings.filter((f) => f.category === categoryFilter);
    if (statusFilter) findings = findings.filter((f) => f.status === statusFilter);
    return {
      success: true,
      data: findings,
      message: `${findings.length} achado(s) (severidade="${severityFilter || "todas"}", categoria="${categoryFilter || "todas"}")`,
    };
  },

  async fix_finding(params: Record<string, unknown>) {
    const findingId = String(params?.findingId || params?.id || "");
    if (!findingId) return { success: false, error: "findingId is required" };
    const finding = await fixFinding(findingId);
    return finding
      ? { success: true, data: finding, message: `Mitigado: ${finding.title}` }
      : { success: false, error: "Finding nao encontrado" };
  },

  async export_report() {
    const report = useSecurityStore.getState().report;
    if (!report) return { success: false, error: "Nenhum relatorio ainda" };
    return { success: true, data: report, message: "Relatorio pronto para exportacao" };
  },
};

export function registerSecurityActions() {
  if (registered) return;
  registered = true;
  registerWorkspaceActions(WORKSPACE_ID, actions);
}

export function unregisterSecurityActions() {
  if (!registered) return;
  registered = false;
  unregisterWorkspaceActions(WORKSPACE_ID);
}
