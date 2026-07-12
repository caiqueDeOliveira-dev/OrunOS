import { useRef, useState } from "react";
import { Mic, Upload, X as XIcon, Send } from "lucide-react";

export interface AttachedImage { base64: string; mime: string; previewUrl: string }

export function ChatInput({
  onSend, onMicClick, listening, onSlashCommand,
}: {
  onSend: (message: string, image?: AttachedImage) => void;
  onMicClick: () => void;
  listening: boolean;
  onSlashCommand?: (command: "vozes" | "model") => void;
}) {
  const [value, setValue] = useState("");
  const [image, setImage] = useState<AttachedImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed && !image) return;
    const lower = trimmed.toLowerCase();
    if ((lower === "/vozes" || lower === "/voz") && onSlashCommand) { onSlashCommand("vozes"); setValue(""); return; }
    if (lower === "/model" && onSlashCommand) { onSlashCommand("model"); setValue(""); return; }
    onSend(trimmed, image || undefined);
    setValue("");
    setImage(null);
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      setImage({ base64, mime: file.type || "image/jpeg", previewUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="px-10 pb-7 pt-3">
      {image && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl" style={{ background: "#0f0f0f", border: "1px solid #222" }}>
          <img src={image.previewUrl} alt="attached" className="rounded-md object-cover" style={{ width: 36, height: 36 }} />
          <span className="text-[10px]" style={{ color: "#666" }}>Image attached</span>
          <button onClick={() => setImage(null)} className="ml-auto p-1" style={{ color: "#555" }}><XIcon size={13} /></button>
        </div>
      )}
      <div
        className="flex items-center gap-3 px-5 py-4 rounded-2xl border"
        style={{
          background: "#0f0f0f",
          borderColor: "#222222",
          boxShadow: "0 0 0 1px rgba(192,0,24,0.04), 0 8px 40px rgba(0,0,0,0.45)",
        }}
      >
        {/* Mic (real dictation via Web Speech API, wired in HomeScreen) */}
        <button
          onClick={onMicClick}
          className="p-2 rounded-lg flex-shrink-0 transition-all"
          style={{
            color: listening ? "#FF1A2D" : "#444",
            background: listening ? "rgba(192,0,24,0.1)" : "transparent",
            boxShadow: listening ? "0 0 10px rgba(192,0,24,0.3)" : "none",
          }}
        >
          <Mic size={17} />
        </button>

        {/* Attach image */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-lg flex-shrink-0 transition-colors"
          style={{ color: image ? "#FF1A2D" : "#333" }}
          onMouseEnter={e => { if (!image) { e.currentTarget.style.color = "#888"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; } }}
          onMouseLeave={e => { if (!image) { e.currentTarget.style.color = "#333"; e.currentTarget.style.background = "transparent"; } }}
          title="Attach a photo (e.g. a meal for the Nutritionist agent)"
        >
          <Upload size={17} />
        </button>

        <div className="w-px self-stretch" style={{ background: "#1e1e1e" }} />

        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="Ask Hampton anything... (try /vozes or /model)"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{
            fontFamily: "'Inter', sans-serif",
            color: "#F5F5F5",
            fontWeight: 300,
          }}
        />
        <style>{`input::placeholder { color: #2a2a2a; }`}</style>

        <button
          onClick={submit}
          className="p-2 rounded-lg flex-shrink-0 transition-all"
          style={{
            background: (value.trim() || image) ? "#C00018" : "transparent",
            color: (value.trim() || image) ? "#F5F5F5" : "#2a2a2a",
            boxShadow: (value.trim() || image) ? "0 0 14px rgba(192,0,24,0.45)" : "none",
          }}
        >
          <Send size={17} />
        </button>
      </div>
      <p className="text-center mt-2.5 text-[9px] tracking-wider" style={{ fontFamily: "'Inter', sans-serif", color: "#222" }}>
        Hampton may make mistakes. Always verify important information.
      </p>
    </div>
  );
}
