import { useEffect, useRef, useState } from "react";
import { Mic, Send, X } from "lucide-react";
import type { HamptonState, Message } from "../types";

const BUBBLE_SIZE = 56;
const CHAT_WIDTH = 340;
const CHAT_HEIGHT = 460;
const MARGIN = 12;

interface FloatingWorkspaceChatProps {
  messages: Message[];
  hamptonState: HamptonState;
  onSendMessage: (content: string) => void;
  onMicClick: () => void;
  voiceVolume: number;
  partialTranscript: string;
}

export function FloatingWorkspaceChat({
  messages,
  hamptonState,
  onSendMessage,
  onMicClick,
  voiceVolume,
  partialTranscript,
}: FloatingWorkspaceChatProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number; moved: boolean } | null>(null);
  const posRef = useRef(pos);
  posRef.current = pos;
  const listRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPos({ x: window.innerWidth - BUBBLE_SIZE - 20, y: window.innerHeight - BUBBLE_SIZE - 20 });
  }, []);

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, messages.length]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const p = posRef.current;
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: p?.x ?? 0, baseY: p?.y ?? 0, moved: false };
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
      if (!d.moved) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const x = Math.min(Math.max(8, d.baseX + dx), vw - BUBBLE_SIZE - 8);
      const y = Math.min(Math.max(8, d.baseY + dy), vh - BUBBLE_SIZE - 8);
      setPos({ x, y });
    };
    const up = () => {
      const d = dragRef.current;
      dragRef.current = null;
      if (d && !d.moved) setOpen((o) => !o);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  let panelX = vw - CHAT_WIDTH - MARGIN;
  let panelY = vh - CHAT_HEIGHT - MARGIN;
  if (pos) {
    let px = pos.x - CHAT_WIDTH - MARGIN;
    if (px < MARGIN) px = pos.x + BUBBLE_SIZE + MARGIN;
    px = Math.max(MARGIN, Math.min(px, vw - CHAT_WIDTH - MARGIN));
    let py = pos.y - CHAT_HEIGHT + BUBBLE_SIZE;
    if (py < MARGIN) py = pos.y + BUBBLE_SIZE + MARGIN;
    py = Math.max(MARGIN, Math.min(py, vh - CHAT_HEIGHT - MARGIN));
    panelX = px;
    panelY = py;
  }

  const send = () => {
    const v = value.trim();
    if (!v) return;
    onSendMessage(v);
    setValue("");
  };

  const active = hamptonState !== "idle";

  return (
    <>
      {open && pos && (
        <div
          className="fixed z-[200] flex flex-col overflow-hidden rounded-2xl border"
          style={{
            left: panelX,
            top: panelY,
            width: CHAT_WIDTH,
            height: CHAT_HEIGHT,
            background: "#0A0A0C",
            borderColor: "rgba(195,0,47,0.25)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.55), 0 0 40px rgba(195,0,47,0.08)",
          }}
        >
          <div className="flex items-center gap-2 px-3 py-2.5 border-b shrink-0" style={{ background: "#141414", borderColor: "#252525" }}>
            <img
              src="./LogoIA.png"
              alt="Hampton"
              className="rounded-full"
              style={{ width: 24, height: 24, objectFit: "cover", border: "1px solid rgba(195,0,47,0.4)" }}
            />
            <span className="text-[10px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#FFFFFF", fontWeight: 600 }}>
              Hampton
            </span>
            <span
              className="w-1.5 h-1.5 rounded-full ml-1"
              style={{ background: active ? "#C3002F" : "#2a2a2a", boxShadow: active ? "0 0 6px #C3002F" : "none" }}
            />
            <span className="text-[9px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#5C5C5C" }}>
              {hamptonState === "thinking" ? "Pensando" : hamptonState === "speaking" ? "Falando" : hamptonState === "listening" ? "Ouvindo" : "Pronto"}
            </span>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto p-1 rounded-md transition-colors hover:bg-[rgba(255,255,255,0.05)]"
              style={{ color: "#A0A0A0" }}
              aria-label="Fechar chat"
              title="Fechar chat"
            >
              <X size={13} />
            </button>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5" style={{ scrollbarWidth: "thin", scrollbarColor: "#383838 transparent" }}>
            {messages.length === 0 && (
              <div className="text-center text-[10px] tracking-wider uppercase mt-8" style={{ fontFamily: "'Sora', sans-serif", color: "#5C5C5C" }}>
                Sem mensagens ainda
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className="flex" style={{ justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div
                  className="px-3 py-2 rounded-xl text-[11px] leading-relaxed max-w-[85%]"
                  style={
                    m.role === "user"
                      ? { background: "#C3002F", color: "#FFFFFF", borderBottomRightRadius: 3 }
                      : { background: "#141414", border: "1px solid #252525", color: "#E8E8E8", borderBottomLeftRadius: 3 }
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          <div className="px-3 pt-1.5 pb-3 shrink-0 border-t" style={{ borderColor: "#252525", background: "#0A0A0C" }}>
            {partialTranscript && hamptonState === "listening" && (
              <div className="text-[10px] text-center mb-1.5 truncate" style={{ color: "#C3002F" }}>
                {partialTranscript}
              </div>
            )}
            <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "#141414", border: "1px solid #252525" }}>
              <button
                onClick={onMicClick}
                className="p-1.5 rounded-md transition-colors"
                style={{ color: hamptonState === "listening" ? "#C3002F" : "#A0A0A0" }}
                aria-label={hamptonState === "listening" ? "Parar ditado" : "Iniciar ditado"}
                title={hamptonState === "listening" ? "Parar ditado" : "Iniciar ditado"}
              >
                <Mic size={15} />
              </button>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
                placeholder="Mensagem..."
                className="flex-1 bg-transparent outline-none text-[12px] min-w-0"
                style={{ fontFamily: "'Inter', sans-serif", color: "#FFFFFF", fontWeight: 300 }}
              />
              <button
                onClick={send}
                className="p-1.5 rounded-md transition-all"
                style={{ background: value.trim() ? "#C3002F" : "transparent", color: value.trim() ? "#FFFFFF" : "#5C5C5C" }}
                aria-label="Enviar"
                title="Enviar"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {pos && (
        <button
          onPointerDown={onPointerDown}
          className="fixed z-[201] flex items-center justify-center rounded-full select-none"
          style={{
            left: pos.x,
            top: pos.y,
            width: BUBBLE_SIZE,
            height: BUBBLE_SIZE,
            background: "radial-gradient(circle at 32% 28%, #17171b 0%, #0c0c0f 55%, #050505 100%)",
            border: "1px solid rgba(195,0,47,0.55)",
            boxShadow: "0 0 16px rgba(195,0,47,0.3), inset 0 0 10px rgba(0,0,0,0.5)",
            cursor: "grab",
            touchAction: "none",
          }}
          aria-label="Abrir chat"
          title="Hampton"
        >
          <img src="./LogoIA.png" alt="Hampton" className="rounded-full pointer-events-none" style={{ width: "82%", height: "82%", objectFit: "cover" }} />
          <span
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 9,
              height: 9,
              right: 2,
              bottom: 2,
              background: active ? "#C3002F" : "#2a2a2a",
              border: "1.5px solid #050505",
              boxShadow: active ? "0 0 6px #C3002F" : "none",
            }}
          />
        </button>
      )}
    </>
  );
}
