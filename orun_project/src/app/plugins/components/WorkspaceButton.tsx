import type { ReactNode, MouseEvent } from "react";

interface Props {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md";
  children: ReactNode;
  onClick?: (e: MouseEvent) => void;
  title?: string;
  className?: string;
  disabled?: boolean;
}

export function WorkspaceButton({ variant = "ghost", size = "sm", children, onClick, title, className = "", disabled }: Props) {
  const base = "ws-button inline-flex items-center gap-1.5 select-none";
  const variants = {
    primary: "ws-button-primary",
    ghost: "ws-button-ghost",
    danger: "ws-button-primary",
  };
  const sizes = {
    sm: "text-[10px] px-2 py-1",
    md: "text-[11px] px-3 py-1.5",
  };
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${className}`;

  return (
    <button className={cls} onClick={onClick} title={title} disabled={disabled}>
      {children}
    </button>
  );
}
