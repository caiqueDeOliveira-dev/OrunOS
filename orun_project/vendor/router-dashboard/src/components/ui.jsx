import React from "react";

const padMap = { none: "", sm: "p-3", md: "p-4", lg: "p-5" };

export function Card({ children, className = "", padding = "md", glow = false }) {
  return (
    <div
      className={`bg-orun-card border border-orun-border rounded-xl ${padMap[padding]} ${
        glow ? "orun-card-glow" : "transition-colors duration-200 hover:border-orun-borderHover"
      } ${className}`}
    >
      {children}
    </div>
  );
}

const spinnerSize = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-8 h-8" };

export function Spinner({ size = "md", className = "" }) {
  return (
    <svg className={`animate-spin text-orun-accent ${spinnerSize[size]} ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-5 h-5 rounded-md bg-orun-accentMuted flex items-center justify-center">
        <span className="w-1.5 h-1.5 rounded-full bg-orun-accent" />
      </div>
      <h2 className="text-xs font-display font-semibold text-orun-text uppercase tracking-wider">{children}</h2>
    </div>
  );
}

export function EmptyState({ children }) {
  return <div className="text-xs text-orun-muted py-6 text-center">{children}</div>;
}

export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner size="lg" />
    </div>
  );
}

export function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-xs py-1">
      <span className="text-orun-textSecondary">{label}</span>
      <span className="text-orun-text font-mono text-2xs">{value}</span>
    </div>
  );
}

export function Dot({ ok }) {
  return (
    <span
      className={`w-1.5 h-1.5 rounded-full inline-block ${
        ok ? "bg-orun-success shadow-[0_0_6px_rgba(0,210,106,0.4)]" : "bg-orun-error"
      }`}
    />
  );
}

export function TierBadge({ tier }) {
  const map = {
    free: "bg-orun-successMuted text-orun-success",
    local: "bg-orun-infoMuted text-orun-info",
    paid: "bg-orun-errorMuted text-orun-error",
    freemium: "bg-orun-infoMuted text-orun-info",
    subscription: "bg-orun-infoMuted text-orun-info",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-2xs font-mono uppercase tracking-wider ${map[tier] ?? map.paid}`}>
      {tier}
    </span>
  );
}
