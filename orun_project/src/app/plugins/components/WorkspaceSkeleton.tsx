interface Props {
  lines?: number;
  height?: string;
}

export function WorkspaceSkeleton({ lines = 4, height = "12px" }: Props) {
  return (
    <div className="flex flex-col gap-2 p-4 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="rounded"
          style={{
            height,
            background: "var(--muted)",
            width: `${80 - i * 10}%`,
            opacity: 1 - i * 0.1,
          }}
        />
      ))}
    </div>
  );
}
