import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: ReactNode;
}

export function WorkspaceHeader({ title, subtitle, actions, icon }: Props) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2">
        {icon && <span className="flex items-center">{icon}</span>}
        <div>
          <span className="ws-title">{title}</span>
          {subtitle && <span className="ws-label ml-2">{subtitle}</span>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </div>
  );
}
