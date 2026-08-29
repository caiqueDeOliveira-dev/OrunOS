import { useState, useCallback } from "react";
import { Shield } from "lucide-react";

interface Props {
  onSendMessage: (message: string) => void;
  label?: string;
}

export function AIFloatingPrompt({ onSendMessage, label = "Agent" }: Props) {
  const [aiPrompt, setAiPrompt] = useState("");

  const handleClick = useCallback(() => {
    const trimmed = aiPrompt.trim();
    if (trimmed) {
      onSendMessage(trimmed);
      setAiPrompt("");
    } else if (aiPrompt === "") {
      setAiPrompt(" ");
    } else {
      setAiPrompt("");
    }
  }, [aiPrompt, onSendMessage]);

  return (
    <div className="absolute bottom-14 right-4 z-50 flex flex-col items-end gap-2">
      {aiPrompt !== "" && (
        <div className="flex gap-2">
          <input
            autoFocus
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && aiPrompt.trim()) { onSendMessage(aiPrompt.trim()); setAiPrompt(""); } }}
            className="ws-input w-48"
            placeholder="Ask the agent..."
          />
        </div>
      )}
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] shadow-lg transition-all hover:brightness-110"
        style={{ background: "var(--primary)", color: "#fff" }}
      >
        <Shield size={12} /> {aiPrompt && aiPrompt.trim() ? "Execute" : label}
      </button>
    </div>
  );
}
