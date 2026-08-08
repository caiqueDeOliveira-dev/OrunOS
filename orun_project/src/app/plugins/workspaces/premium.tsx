// plugins/workspaces/premium.tsx
// Shared premium Orun OS design system — fixed dark palette + reusable components.
// All workspaces should import from here for a consistent, professional look.

import type { ReactNode, CSSProperties, ChangeEvent } from "react";
import { ArrowLeft, ChevronRight, type LucideIcon } from "lucide-react";

export const P = {
  bg: "#050505",
  panel: "#0A0A0C",
  card: "#141414",
  card2: "#1C1C1C",
  border: "#252525",
  borderHi: "#383838",
  text: "#FFFFFF",
  sub: "#A0A0A0",
  dim: "#5C5C5C",
  primary: "#C3002F",
  success: "#00D26A",
  alert: "#FFB547",
  error: "#FF4B4B",
  info: "#4DA3FF",
  violet: "#8B5CF6",
};

export const HS_SCROLL = `
  .hs-scroll { scrollbar-width: thin; scrollbar-color: #2a2a2a #050505; }
  .hs-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
  .hs-scroll::-webkit-scrollbar-track { background: #050505; }
  .hs-scroll::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 8px; }
  .hs-scroll::-webkit-scrollbar-thumb:hover { background: #3a3a3a; }
`;

// ── Layout shells ─────────────────────────────────────────────────────

export function PremiumRoot({ children, style, className = "" }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <div
      className={`flex flex-col h-full overflow-hidden ${className}`}
      style={{ background: P.bg, color: P.text, fontFamily: "'Inter', sans-serif", ...style }}
    >
      <style>{HS_SCROLL}</style>
      {children}
    </div>
  );
}

export function ScrollArea({ children, className = "", ref, ...rest }: {
  children: ReactNode; className?: string; ref?: React.Ref<HTMLDivElement>;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div ref={ref} className={`flex-1 overflow-y-auto hs-scroll ${className}`} {...rest}>
      {children}
    </div>
  );
}

// ── Typography / headers ──────────────────────────────────────────────

export function SectionHeader({ icon: Icon, title, right, onClick }: {
  icon: LucideIcon; title: string; right?: ReactNode; onClick?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <button
        onClick={onClick}
        disabled={!onClick}
        className="flex items-center gap-2 min-w-0 group"
        style={{ cursor: onClick ? "pointer" : "default" }}
      >
        <Icon size={14} strokeWidth={1.8} color={P.primary} className="shrink-0" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] truncate" style={{ color: P.text }}>{title}</h3>
        {onClick && <ChevronRight size={12} color={P.dim} className="shrink-0 transition-transform group-hover:translate-x-0.5" />}
      </button>
      {right}
    </div>
  );
}

export function PageHeader({ icon: Icon, title, subtitle, onBack, actions }: {
  icon: LucideIcon; title: string; subtitle?: string; onBack?: () => void; actions?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      {onBack && (
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all hover:scale-105 hover:shadow-[0_0_16px_rgba(195,0,47,0.15)]"
          style={{ background: P.card, border: `1px solid ${P.border}`, color: P.sub }}
          title="Voltar"
        >
          <ArrowLeft size={16} />
        </button>
      )}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(195,0,47,0.14)", color: P.primary }}>
        <Icon size={18} strokeWidth={1.7} />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-[16px] font-semibold truncate" style={{ color: P.text }}>{title}</h2>
        {subtitle && <p className="text-[10px] mt-0.5 truncate" style={{ color: P.sub }}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Greeting({ label }: { label: string }) {
  return (
    <div className="px-1">
      <h1 className="text-[24px] leading-[1.18] font-semibold" style={{ color: P.text }}>{label}</h1>
      <p className="text-[11px] mt-2" style={{ color: P.sub }}>Orun OS workspace</p>
    </div>
  );
}

// ── Cards ─────────────────────────────────────────────────────────────

export function Card({ children, style, className = "", hover = false, onClick }: {
  children: ReactNode; style?: CSSProperties; className?: string; hover?: boolean; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-[18px] ${hover ? "transition-all hover:scale-[1.01] hover:shadow-[0_0_24px_rgba(195,0,47,0.08)]" : ""} ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{ background: P.card, border: `1px solid ${P.border}`, ...style }}
    >
      {children}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, status, tone, onClick }: {
  icon: LucideIcon; label: string; value: string; status?: string; tone?: "ok" | "err" | "warn" | "neutral"; onClick?: () => void;
}) {
  const c = tone === "ok" ? P.success : tone === "err" ? P.error : tone === "warn" ? P.alert : P.sub;
  return (
    <Card hover onClick={onClick} className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: P.card2, color: P.primary }}>
          <Icon size={16} strokeWidth={1.7} />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-[0.14em]" style={{ color: P.dim }}>{label}</p>
          <p className="text-[13px] font-semibold mt-0.5 tabular-nums truncate" style={{ color: P.text }}>{value}</p>
        </div>
      </div>
      {status && (
        <span className="flex items-center gap-1.5 text-[9px] font-medium shrink-0" style={{ color: c }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
          {status}
        </span>
      )}
    </Card>
  );
}

// ── Buttons / inputs / badges ─────────────────────────────────────────

export function PrimaryButton({ children, onClick, disabled, className = "" }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium transition-all hover:scale-[1.02] hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${className}`}
      style={{ background: P.primary, color: "#fff" }}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, disabled, className = "" }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${className}`}
      style={{ background: P.card, border: `1px solid ${P.border}`, color: P.text }}
    >
      {children}
    </button>
  );
}

export function Input({ value, onChange, placeholder, type = "text", className = "" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string;
}) {
  const style: CSSProperties = {
    padding: "11px 13px",
    borderRadius: 12,
    fontSize: 12,
    background: P.panel,
    color: P.text,
    border: `1px solid ${P.borderHi}`,
    outline: "none",
    width: "100%",
  };
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      className={className}
      style={style}
    />
  );
}

export function Badge({ children, tone = "neutral" }: {
  children: ReactNode; tone?: "ok" | "err" | "warn" | "info" | "violet" | "neutral";
}) {
  const c = tone === "ok" ? P.success : tone === "err" ? P.error : tone === "warn" ? P.alert : tone === "info" ? P.info : tone === "violet" ? P.violet : P.sub;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-semibold tracking-wider uppercase" style={{ background: `${c}1F`, color: c, border: `1px solid ${c}33` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
      {children}
    </span>
  );
}

export function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className="relative w-10 h-[22px] rounded-full transition-all disabled:opacity-50"
      style={{ background: on ? P.success : P.card2, border: `1px solid ${on ? "transparent" : P.borderHi}` }}
      aria-pressed={on}
    >
      <span className="absolute top-[3px] w-4 h-4 rounded-full transition-all" style={{ left: on ? 20 : 3, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
    </button>
  );
}
