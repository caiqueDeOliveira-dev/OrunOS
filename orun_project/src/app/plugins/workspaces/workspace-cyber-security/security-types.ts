// workspace-cyber-security types

export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface SecurityFinding {
  id: string;
  title: string;
  severity: FindingSeverity;
  category: string;
  description: string;
  recommendation: string;
  file?: string;
  status: "open" | "mitigated";
}

export interface SecurityReport {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  ranAt: string;
  summary: {
    total: number;
    open: number;
    mitigated: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    categories: string[];
  };
  findings: SecurityFinding[];
}
