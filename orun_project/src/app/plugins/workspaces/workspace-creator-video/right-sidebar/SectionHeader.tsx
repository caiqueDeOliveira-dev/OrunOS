import { SANS } from "../video-types";

export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, color: "#C9D1D9", fontFamily: SANS, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "6px 0", borderBottom: "1px solid #21262D", marginBottom: 6, marginTop: 8 }}>
      {children}
    </div>
  );
}
