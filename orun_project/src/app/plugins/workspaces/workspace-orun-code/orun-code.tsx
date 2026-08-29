// plugins/workspaces/workspace-orun-code/orun-code.ts
// Orun Code design tokens — a professional IDE palette + the Orun AI workspace layer.
// Editor-first, dark, minimal. Red reserved for actions/active state.

import type { CSSProperties, ReactNode } from "react";

export const OC = {
  bg: "#0B0D10",
  panel: "#0E1013",
  card: "#101318",
  card2: "#151920",
  card3: "#1A1F27",
  border: "#20252D",
  borderHi: "#292F38",
  text: "#F2F4F7",
  sub: "#A7ADB7",
  dim: "#6E7580",
  primary: "#E50914",
  primaryBright: "#FF3340",
  primaryDark: "#8F050D",
  success: "#22C55E",
  alert: "#F59E0B",
  error: "#EF4444",
  info: "#4DA3FF",
  violet: "#8B5CF6",
  mono: "'JetBrains Mono', monospace",
  sans: "'Inter', sans-serif",
};

export const OC_SCROLL = `
  .oc-scroll { scrollbar-width: thin; scrollbar-color: #292F38 #0B0D10; }
  .oc-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
  .oc-scroll::-webkit-scrollbar-track { background: #0B0D10; }
  .oc-scroll::-webkit-scrollbar-thumb { background: #292F38; border-radius: 8px; }
  .oc-scroll::-webkit-scrollbar-thumb:hover { background: #3A414C; }
`;

export const OC_CSS_VARS = `
  :root {
    --oc-bg: ${OC.bg};
    --oc-panel: ${OC.panel};
    --oc-card: ${OC.card};
    --oc-card2: ${OC.card2};
    --oc-card3: ${OC.card3};
    --oc-border: ${OC.border};
    --oc-border-hi: ${OC.borderHi};
    --oc-text: ${OC.text};
    --oc-sub: ${OC.sub};
    --oc-dim: ${OC.dim};
    --oc-primary: ${OC.primary};
    --oc-primary-bright: ${OC.primaryBright};
    --oc-success: ${OC.success};
    --oc-alert: ${OC.alert};
    --oc-error: ${OC.error};
    --oc-info: ${OC.info};
  }
`;

export function OCRoot({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex flex-col h-full overflow-hidden ${className}`}
      style={{ background: OC.bg, color: OC.text, fontFamily: OC.sans }}
    >
      <style>{OC_SCROLL}</style>
      <style>{OC_CSS_VARS}</style>
      {children}
    </div>
  );
}

// ── Orun AI agent modes ────────────────────────────────────────────────

export type AICodeMode = "plan" | "act";

export const AI_MODE_META: Record<AICodeMode, { label: string; desc: string; color: string }> = {
  plan: {
    label: "Plan",
    desc: "Lê, analisa e propõe — não altera arquivos.",
    color: OC.info,
  },
  act: {
    label: "Act",
    desc: "Executa, edita arquivos, roda comandos e aplica mudanças.",
    color: OC.success,
  },
};

export function modePillStyle(mode: AICodeMode): CSSProperties {
  const c = AI_MODE_META[mode].color;
  return {
    background: `${c}1A`,
    color: c,
    border: `1px solid ${c}40`,
    fontFamily: OC.mono,
  };
}
