import { P } from "../../premium";
import { SANS } from "../video-types";

export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, color: P.sub, fontFamily: SANS, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "6px 0", borderBottom: `1px solid ${P.border}`, marginBottom: 6, marginTop: 8 }}>
      {children}
    </div>
  );
}
