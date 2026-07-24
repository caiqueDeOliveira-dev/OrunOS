import React, { useState, useEffect } from "react";
import { Shield, ShieldOff, AlertTriangle } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";

export const EncryptionToggle: React.FC = () => {
  const { t } = useTranslation();
  const [encrypted, setEncrypted] = useState<boolean>(false);
  const [weakMode, setWeakMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [showWarning, setShowWarning] = useState<boolean>(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const [status, weak] = await Promise.all([
          window.orun.settings.isDBEncrypted(),
          window.orun.settings.isEncryptionWeakMode?.() ?? Promise.resolve(false),
        ]);
        setEncrypted(status);
        setWeakMode(weak);
      } catch (err) {
        console.error("Failed to check encryption status:", err);
      } finally {
        setLoading(false);
      }
    };
    checkStatus();
  }, []);

  const handleToggle = async () => {
    if (encrypted) {
      setShowWarning(true);
      return;
    }

    setLoading(true);
    try {
      await window.orun.settings.encryptDB();
      setEncrypted(true);
    } catch (err) {
      console.error("Failed to encrypt:", err);
    } finally {
      setLoading(false);
    }
  };

  const confirmDisable = async () => {
    setShowWarning(false);
    setLoading(true);
    try {
      await window.orun.settings.decryptDB();
      setEncrypted(false);
    } catch (err) {
      console.error("Failed to decrypt:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
        <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }} />
        <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>Verificando status...</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2">
          {encrypted ? (
            <Shield size={16} style={{ color: "#2ecc71" }} />
          ) : (
            <ShieldOff size={16} style={{ color: "var(--muted-foreground)" }} />
          )}
          <div>
            <div className="text-sm font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
              Criptografia do Banco de Dados
            </div>
            <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {encrypted ? "Ativada (AES-256-GCM)" : "Desativada"}
            </div>
          </div>
        </div>
        <button
          onClick={handleToggle}
          className="relative w-10 h-5 rounded-full transition-all"
          style={{
            background: encrypted ? "#2ecc71" : "var(--switch-background)",
          }}
        >
          <div
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
            style={{
              left: encrypted ? "22px" : "2px",
            }}
          />
        </button>
      </div>

      {weakMode && (
        <div className="flex items-center gap-2 p-2 rounded-lg mt-2" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
          <AlertTriangle size={14} style={{ color: "#f59e0b" }} />
          <span className="text-xs" style={{ color: "#f59e0b" }}>{t("encryptionWeakMode")}</span>
        </div>
      )}

      {showWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-xl p-6 max-w-sm mx-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={20} style={{ color: "#f59e0b" }} />
              <h3 className="text-lg font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
                Desativar Criptografia?
              </h3>
            </div>
            <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
              Seus dados ficarão visíveis em texto plano no disco. Isso pode representar um risco de segurança.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowWarning(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDisable}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ background: "var(--destructive)", color: "var(--foreground)" }}
              >
                Desativar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
