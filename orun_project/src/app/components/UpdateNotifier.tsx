import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import { isElectron } from "../constants";

type UpdateStatus = "idle" | "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error";

export function UpdateNotifier() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [version, setVersion] = useState("");
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isElectron) return;

    const show = (s: UpdateStatus) => { setStatus(s); setVisible(true); };
    const hide = () => { setTimeout(() => setVisible(false), 2000); };

    const off1 = window.orun.app.onUpdateChecking(() => show("checking"));
    const off2 = window.orun.app.onUpdateAvailable((data) => { setVersion(data.version); show("available"); });
    const off3 = window.orun.app.onUpdateNotAvailable(() => { setStatus("not-available"); hide(); });
    const off4 = window.orun.app.onUpdateProgress((data) => { setProgress(data.percent); show("downloading"); });
    const off5 = window.orun.app.onUpdateDownloaded((data) => { setVersion(data.version); show("downloaded"); });
    const off6 = window.orun.app.onUpdateError(() => { setStatus("error"); hide(); });

    return () => { off1(); off2(); off3(); off4(); off5(); off6(); };
  }, []);

  if (!isElectron) return null;

  const isDownloading = status === "downloading";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-10 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            background: "rgba(59,130,246,0.15)",
            border: "1px solid rgba(59,130,246,0.3)",
            backdropFilter: "blur(12px)",
          }}
        >
          {status === "checking" && <RefreshCw size={14} className="animate-spin" style={{ color: "#3B82F6" }} />}
          {status === "available" && <Download size={14} style={{ color: "#3B82F6" }} />}
          {status === "downloaded" && <CheckCircle size={14} style={{ color: "#22C55E" }} />}
          {status === "error" && <AlertCircle size={14} style={{ color: "#EF4444" }} />}

          <span className="text-[11px] font-medium" style={{ color: "#E2E8F0", fontFamily: "'Sora', sans-serif" }}>
            {status === "checking" && t("update_available")}
            {status === "available" && `${t("update_available")} v${version}`}
            {status === "downloading" && `${t("update_available")} ${progress}%`}
            {status === "downloaded" && `${t("update_available")} v${version}`}
            {status === "not-available" && ""}
            {status === "error" && ""}
          </span>

          {status === "available" && (
            <button
              onClick={() => window.orun.app.checkForUpdates()}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer"
              style={{
                background: "rgba(59,130,246,0.3)",
                color: "#93C5FD",
                border: "1px solid rgba(59,130,246,0.4)",
              }}
            >
              <Download size={10} />
              {t("update_available")}
            </button>
          )}

          {isDownloading && (
            <div className="w-16 h-1 rounded-full" style={{ background: "rgba(59,130,246,0.2)" }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, background: "#3B82F6" }}
              />
            </div>
          )}

          <button
            onClick={() => setVisible(false)}
            className="text-[10px] opacity-50 hover:opacity-100 cursor-pointer"
            style={{ color: "#E2E8F0" }}
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
