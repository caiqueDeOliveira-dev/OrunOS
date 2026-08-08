import { SANS } from "../video-types";

export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, color: "#FFFFFF", fontFamily: SANS, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "6px 0", borderBottom: "1px solid #141414", marginBottom: 6, marginTop: 8 }}>
      {children}
    </div>
  );
}
