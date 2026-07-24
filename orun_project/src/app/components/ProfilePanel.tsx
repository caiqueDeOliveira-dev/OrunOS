import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, User, Camera, Mic, Square, Trash2, Check } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import { VolumeVisualizer } from "./VolumeVisualizer";

interface ProfileData {
  name: string;
  photoUrl: string | null;
  voiceBlob: string | null; // base64
  voiceDuration: number;
}

interface ProfilePanelProps {
  onClose: () => void;
}

export function ProfilePanel({ onClose }: ProfilePanelProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [voiceBlob, setVoiceBlob] = useState<string | null>(null);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const [saved, setSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const recordingStartRef = useRef(0);

  // Load profile from settings on mount
  useEffect(() => {
    window.orun?.settings?.get<ProfileData>("profile").then((data) => {
      if (data) {
        setName(data.name || "");
        setPhotoUrl(data.photoUrl || null);
        setVoiceBlob(data.voiceBlob || null);
        setVoiceDuration(data.voiceDuration || 0);
      }
    }).catch(() => {});
  }, []);

  // Save profile
  const handleSave = useCallback(async () => {
    const data: ProfileData = { name, photoUrl, voiceBlob, voiceDuration };
    await window.orun?.settings?.set("profile", data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [name, photoUrl, voiceBlob, voiceDuration]);

  // Photo upload
  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  // Voice recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus" : "audio/webm",
      });
      chunksRef.current = [];
      recordingStartRef.current = Date.now();

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        cleanupRecording();
        if (chunksRef.current.length === 0) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const reader = new FileReader();
        reader.onload = () => {
          setVoiceBlob(reader.result as string);
          setVoiceDuration(Date.now() - recordingStartRef.current);
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);

      // Volume analyser
      intervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        setVolume(sum / data.length / 255);
      }, 50);
    } catch (err) {
      console.error("[profile] mic error:", err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const cleanupRecording = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setVolume(0);
  }, []);

  // Play voice preview
  const playVoice = useCallback(() => {
    if (!voiceBlob) return;
    const audio = new Audio(voiceBlob);
    audio.play().catch(() => {});
  }, [voiceBlob]);

  // Cleanup on unmount
  useEffect(() => () => cleanupRecording(), [cleanupRecording]);

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        className="relative w-full max-w-md mx-4 rounded-2xl border overflow-hidden flex flex-col"
        style={{ background: "var(--background)", borderColor: "var(--border)", maxHeight: "85vh" }}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#C0001815" }}>
              <User size={14} style={{ color: "#C00018" }} />
            </div>
            <span className="text-sm font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
              {t("profileTitle")}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--muted-foreground)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--foreground)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--muted-foreground)")}
            aria-label={t("close")}>
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Photo */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <div
                className="w-24 h-24 rounded-full overflow-hidden border-2 flex items-center justify-center cursor-pointer"
                style={{ borderColor: "var(--border)", background: "var(--secondary)" }}
                onClick={() => fileInputRef.current?.click()}
              >
                {photoUrl ? (
                  <img src={photoUrl} alt="profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={36} style={{ color: "var(--muted-foreground)" }} />
                )}
              </div>
              <div
                className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                style={{ background: "rgba(0,0,0,0.5)" }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera size={20} className="text-white" />
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg text-[10px] transition-colors"
                style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted-foreground)", fontFamily: "'Sora', sans-serif" }}
              >
                {t("profilePhotoChange")}
              </button>
              {photoUrl && (
                <button
                  onClick={() => setPhotoUrl(null)}
                  className="px-3 py-1.5 rounded-lg text-[10px] transition-colors"
                  style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "#C00018", fontFamily: "'Sora', sans-serif" }}
                >
                  {t("profilePhotoRemove")}
                </button>
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-[10px] tracking-wider uppercase block mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
              {t("profileName")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("profileNamePlaceholder")}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "'Inter', sans-serif" }}
              aria-label={t("profileName")}
            />
          </div>

          {/* Voice Recording */}
          <div>
            <label className="text-[10px] tracking-wider uppercase block mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
              {t("profileVoiceRecording")}
            </label>
            <div className="rounded-lg p-3" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: isRecording ? "#C00018" : "var(--background)",
                    border: `2px solid ${isRecording ? "#C00018" : "var(--border)"}`,
                    color: isRecording ? "#fff" : "var(--muted-foreground)",
                    boxShadow: isRecording ? "0 0 14px #C0001850" : "none",
                  }}
                >
                  {isRecording ? <Square size={14} fill="currentColor" /> : <Mic size={16} />}
                </button>
                {isRecording && (
                  <div className="flex-1">
                    <VolumeVisualizer volume={volume} isRecording={true} size={24} barCount={12} />
                  </div>
                )}
                {!isRecording && voiceBlob && (
                  <div className="flex-1 flex items-center gap-2">
                    <button onClick={playVoice} className="text-[10px] px-2 py-1 rounded" style={{ color: "#C00018" }}>
                      ▶ {formatDuration(voiceDuration)}
                    </button>
                    <button onClick={() => { setVoiceBlob(null); setVoiceDuration(0); }}
                      className="p-1 rounded" style={{ color: "var(--muted-foreground)" }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
                {!isRecording && !voiceBlob && (
                  <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                    {t("profileVoiceRecord")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t shrink-0 flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
          <AnimatePresence>
            {saved && (
              <motion.div
                className="flex items-center gap-1.5 text-[10px]"
                style={{ color: "#22C55E" }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
              >
                <Check size={12} /> {t("profileSaved")}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex-1" />
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-lg text-[10px] font-medium"
            style={{ background: "#C00018", color: "#fff", fontFamily: "'Sora', sans-serif" }}
          >
            {t("profileSave")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
