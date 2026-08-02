import { labelStyle } from "../video-types";

export function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5" style={{ marginBottom: 6 }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  );
}
