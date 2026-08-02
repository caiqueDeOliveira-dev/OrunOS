interface Props {
  children: string;
  variant?: "red" | "green" | "yellow" | "blue" | "default";
}

export function WorkspaceBadge({ children, variant = "default" }: Props) {
  const variants: Record<string, string> = {
    red: "ws-badge-red",
    green: "ws-badge-green",
    yellow: "ws-badge-yellow",
    blue: "ws-badge-blue",
    default: "bg-white/[0.05] text-muted-foreground",
  };
  return <span className={`ws-badge ${variants[variant] || variants.default}`}>{children}</span>;
}
