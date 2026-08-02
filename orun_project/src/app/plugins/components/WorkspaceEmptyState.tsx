import type { ReactNode } from "react";

interface Props {
  icon: ReactNode;
  message: string;
  action?: ReactNode;
}

export function WorkspaceEmptyState({ icon, message, action }: Props) {
  return (
    <div className="ws-empty">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(192,0,24,0.08)" }}>
        {icon}
      </div>
      <p className="ws-body">{message}</p>
      {action}
    </div>
  );
}
