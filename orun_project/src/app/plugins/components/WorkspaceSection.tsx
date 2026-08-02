import type { ReactNode } from "react";

interface Props {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function WorkspaceSection({ title, children, className = "" }: Props) {
  return (
    <div className={`ws-section ${className}`}>
      {title && (
        <div className="flex items-center gap-2 mb-3">
          <span className="ws-label">{title}</span>
          <hr className="flex-1 ws-divider" />
        </div>
      )}
      {children}
    </div>
  );
}
