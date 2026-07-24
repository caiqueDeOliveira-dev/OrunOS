import React, { useRef, useState, useEffect, useCallback } from "react";
import { Mic, Upload, X as XIcon, Send, Command } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import { useToast } from "./Toast";
import { VolumeVisualizer } from "./VolumeVisualizer";
import { LiveTranscription } from "./LiveTranscription";

export interface AttachedImage { base64: string; mime: string; previewUrl: string }

interface SlashCommand {
  command: string;
  label: string;
  description: string;
}

const getSlashCommands = (t: (key: string) => string): SlashCommand[] => [
  { command: "/historico", label: t("slashHistory"), description: t("slashHistoryDesc") },
  { command: "/limpar", label: t("slashClear"), description: t("slashClearDesc") },
  { command: "/resumir", label: t("slashSummarize"), description: t("slashSummarizeDesc") },
  { command: "/exportar", label: t("slashExport"), description: t("slashExportDesc") },
  { command: "/vozes", label: t("slashVoices"), description: t("slashVoicesDesc") },
  { command: "/model", label: t("slashModel"), description: t("slashModelDesc") },
  { command: "/memoria", label: t("slashMemory"), description: t("slashMemoryDesc") },
  { command: "/agentes", label: t("slashAgents"), description: t("slashAgentsDesc") },
  { command: "/ajuda", label: t("slashHelp"), description: t("slashHelpDesc") },
];

export const ChatInput = React.memo(function ChatInput({
  onSend, onMicClick, listening, onSlashCommand, volume = 0, partialTranscript = "",
}: {
  onSend: (message: string, image?: AttachedImage) => void;
  onMicClick: () => void;
  listening: boolean;
  onSlashCommand?: (command: string) => void;
  volume?: number;
  partialTranscript?: string;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [value, setValue] = useState("");
  const [image, setImage] = useState<AttachedImage | null>(null);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSubmitRef = useRef<number>(0);

  const filteredCommands = getSlashCommands(t).filter(
    (cmd) => cmd.command.includes(slashFilter.toLowerCase()) || cmd.label.toLowerCase().includes(slashFilter.toLowerCase())
  );

  useEffect(() => { setSlashIndex(0); }, [slashFilter]);

  const submit = useCallback(() => {
    const now = Date.now();
    if (now - lastSubmitRef.current < 1000) return; // debounce 1s
    lastSubmitRef.current = now;
    const trimmed = value.trim();
    if (!trimmed && !image) return;
    const lower = trimmed.toLowerCase();
    if (lower === "/vozes" || lower === "/voz") { onSlashCommand?.("vozes"); setValue(""); setSlashOpen(false); return; }
    if (lower === "/model") { onSlashCommand?.("model"); setValue(""); setSlashOpen(false); return; }
    if (lower === "/limpar") { onSlashCommand?.("limpar"); setValue(""); setSlashOpen(false); return; }
    if (lower === "/resumir") { onSlashCommand?.("resumir"); setValue(""); setSlashOpen(false); return; }
    if (lower === "/exportar") { onSlashCommand?.("exportar"); setValue(""); setSlashOpen(false); return; }
    if (lower === "/historico") { onSlashCommand?.("historico"); setValue(""); setSlashOpen(false); return; }
    if (lower === "/memoria") { onSlashCommand?.("memoria"); setValue(""); setSlashOpen(false); return; }
    if (lower === "/agentes") { onSlashCommand?.("agentes"); setValue(""); setSlashOpen(false); return; }
    if (lower === "/ajuda") { onSlashCommand?.("ajuda"); setValue(""); setSlashOpen(false); return; }
    onSend(trimmed, image || undefined);
    setValue("");
    setImage(null);
    setSlashOpen(false);
  }, [value, image, onSend, onSlashCommand]);

  const handleChange = (val: string) => {
    setValue(val);
    if (val.startsWith("/")) {
      setSlashOpen(true);
      setSlashFilter(val);
    } else {
      setSlashOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (slashOpen && filteredCommands.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSlashIndex((i) => Math.min(i + 1, filteredCommands.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSlashIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Tab" || (e.key === "Enter" && slashOpen)) {
        e.preventDefault();
        const cmd = filteredCommands[slashIndex];
        if (cmd) { setValue(cmd.command + " "); setSlashOpen(false); }
        return;
      }
      if (e.key === "Escape") { setSlashOpen(false); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  const selectCommand = (cmd: SlashCommand) => {
    setValue(cmd.command + " ");
    setSlashOpen(false);
    inputRef.current?.focus();
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const handleFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE) { toast.show(t("chatFileTooLarge"), "error"); return; }
    if (!file.type.startsWith("image/")) { toast.show(t("chatUnsupportedFile"), "error"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      setImage({ base64, mime: file.type || "image/jpeg", previewUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="px-10 pb-7 pt-3 relative">
      {/* Live transcription overlay */}
      <LiveTranscription text={partialTranscript} isVisible={listening} />

      {image && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <img src={image.previewUrl} alt="attached" className="rounded-md object-cover" style={{ width: 36, height: 36 }} />
          <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{t("chatImageAttached")}</span>
          <button onClick={() => setImage(null)} className="ml-auto p-1" style={{ color: "var(--muted-foreground)" }}><XIcon size={13} /></button>
        </div>
      )}

      {/* Slash Commands Dropdown */}
      {slashOpen && filteredCommands.length > 0 && (
        <div
          id="slash-command-listbox"
          role="listbox"
          aria-label={t("slashCommands") || "Slash commands"}
          className="absolute bottom-full left-10 right-10 mb-2 rounded-xl border overflow-hidden z-50"
          style={{ background: "var(--card)", borderColor: "var(--border)", boxShadow: "0 -8px 30px rgba(0,0,0,0.3)" }}
        >
          <div className="px-3 py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
            <span className="text-[9px] tracking-wider uppercase" style={{ color: "var(--muted-foreground)", fontFamily: "'Sora', sans-serif" }}>{t("chatInputCommands")}</span>
          </div>
          {filteredCommands.map((cmd, i) => (
            <button
              key={cmd.command}
              id={`slash-command-option-${i}`}
              role="option"
              aria-selected={i === slashIndex}
              onClick={() => selectCommand(cmd)}
              className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors"
              style={{
                background: i === slashIndex ? "var(--accent)" : "transparent",
              }}
              onMouseEnter={() => setSlashIndex(i)}
            >
              <Command size={12} style={{ color: "var(--primary)" }} />
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-medium" style={{ color: "var(--foreground)" }}>{cmd.command}</span>
                <span className="text-[10px] ml-2" style={{ color: "var(--muted-foreground)" }}>{cmd.description}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <div
        className="flex items-center gap-3 px-5 py-4 rounded-2xl border"
        style={{
          background: "var(--card)",
          borderColor: "var(--border)",
          boxShadow: "0 0 0 1px color-mix(in srgb, var(--primary) 4%, transparent), 0 8px 40px rgba(0,0,0,0.15)",
        }}
      >
        <button
          onClick={(e) => { e.preventDefault(); onMicClick(); }}
          aria-label={listening ? t("ariaStopDictation") : t("ariaStartDictation")}
          className="p-2 rounded-lg flex-shrink-0 transition-all select-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] outline-none"
          style={{
            color: listening ? "var(--primary)" : "var(--muted-foreground)",
            background: listening ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "transparent",
            boxShadow: listening ? "0 0 14px color-mix(in srgb, var(--primary) 30%, transparent)" : "none",
          }}
        >
          {listening ? (
            <VolumeVisualizer
              volume={volume}
              isRecording={listening}
              size={36}
              barCount={16}
            />
          ) : (
            <Mic size={17} />
          )}
        </button>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-lg flex-shrink-0 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--primary)] outline-none"
          style={{ color: image ? "var(--primary)" : "var(--muted-foreground)" }}
          onMouseEnter={e => { if (!image) { e.currentTarget.style.color = "var(--foreground)"; e.currentTarget.style.background = "var(--accent)"; } }}
          onMouseLeave={e => { if (!image) { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "transparent"; } }}
          title={t("chatAttachPhoto")}
          aria-label={t("chatAttachPhoto")}
        >
          <Upload size={17} />
        </button>

        <div className="w-px self-stretch" style={{ background: "var(--border)" }} />

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("chatPlaceholder")}
          className="flex-1 bg-transparent outline-none text-sm"
          role={slashOpen ? "combobox" : undefined}
          aria-expanded={slashOpen}
          aria-controls={slashOpen ? "slash-command-listbox" : undefined}
          aria-activedescendant={slashOpen && filteredCommands.length > 0 ? `slash-command-option-${slashIndex}` : undefined}
          style={{
            fontFamily: "'Inter', sans-serif",
            color: "var(--foreground)",
            fontWeight: 300,
          }}
        />

        <button
          onClick={submit}
          aria-label={t("ariaSendMessage")}
          className="p-2 rounded-lg flex-shrink-0 transition-all focus-visible:ring-2 focus-visible:ring-[var(--primary)] outline-none"
          style={{
            background: (value.trim() || image) ? "var(--primary)" : "transparent",
            color: (value.trim() || image) ? "var(--primary-foreground)" : "var(--muted-foreground)",
            boxShadow: (value.trim() || image) ? "0 0 14px color-mix(in srgb, var(--primary) 45%, transparent)" : "none",
          }}
        >
          <Send size={17} />
        </button>
      </div>
      <p className="text-center mt-2.5 text-[9px] tracking-wider" style={{ fontFamily: "'Inter', sans-serif", color: "var(--muted-foreground)" }}>
        {t("chatDisclaimer")}
      </p>
    </div>
  );
});
