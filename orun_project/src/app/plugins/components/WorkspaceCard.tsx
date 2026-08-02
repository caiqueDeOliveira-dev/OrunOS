import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function WorkspaceCard({ children, className = "", hover = false, padding = true, onClick, style }: Props) {
  const base = hover ? "ws-card-hover" : "ws-card";
  const cls = `${base} ${padding ? "p-4" : ""} ${onClick ? "cursor-pointer" : ""} ${className}`;
  return (
    <div className={cls} onClick={onClick} style={style}>
      {children}
    </div>
  );
}
