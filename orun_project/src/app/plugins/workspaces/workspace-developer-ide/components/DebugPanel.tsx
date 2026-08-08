import { BugPlay } from "lucide-react";

export function DebugPanel() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b shrink-0" style={{ borderColor: "#252525" }}>
        <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#A0A0A0" }}>
          Run & Debug
        </span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 text-center">
        <BugPlay size={24} style={{ color: "#A0A0A0", opacity: 0.3 }} />
        <p className="text-[10px]" style={{ color: "#A0A0A0" }}>Press <span className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: "#1C1C1C", fontFamily: "'JetBrains Mono', monospace" }}>F5</span> to start debugging</p>
      </div>
    </div>
  );
}
