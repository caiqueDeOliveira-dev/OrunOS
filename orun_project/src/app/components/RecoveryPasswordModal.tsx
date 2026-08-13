import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useToast } from "./Toast";

const RECOVERY_PREFIX = "orun-os://auth/recovery";

interface RecoveryPasswordModalProps {
  onAuthenticated?: () => void;
}

export function RecoveryPasswordModal({ onAuthenticated }: RecoveryPasswordModalProps) {
  const { show: toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.orun?.deepLink?.onOpen) return;
    let cancelled = false;
    const unsub = window.orun.deepLink.onOpen(async (url: string) => {
      if (!url || !url.startsWith(RECOVERY_PREFIX) || cancelled) return;
      setError(null);
      setOpen(true);
      setBusy(true);
      try {
        await window.orun.auth.completeRecovery(url);
        onAuthenticated?.();
        setBusy(false);
      } catch (err: any) {
        setBusy(false);
        setError(err?.message || "Link de recuperação inválido ou expirado. Solicite um novo link.");
      }
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [onAuthenticated]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    setBusy(true);
    try {
      await window.orun.auth.updatePassword(password);
      setBusy(false);
      setOpen(false);
      setPassword("");
      setConfirm("");
      toast("Senha redefinida com sucesso.", "success");
    } catch (err: any) {
      setBusy(false);
      setError(err?.message || "Não foi possível trocar a senha. Tente novamente.");
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--input)",
    border: "1px solid var(--border)",
    color: "var(--foreground)",
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[10000] flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl p-8"
            style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
          >
            <div className="flex flex-col items-center mb-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-3" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                🔑
              </div>
              <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Redefinir senha</h2>
              <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
                {busy ? "Validando seu link de recuperação..." : "Escolha uma nova senha para sua conta."}
              </p>
            </div>

            {busy ? (
              <div className="flex justify-center py-8">
                <span className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }} />
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nova senha (mín. 6 caracteres)"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2"
                  style={{ ...inputStyle, ["--tw-ring-color" as any]: "var(--ring)" }}
                />
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirme a nova senha"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2"
                  style={{ ...inputStyle, ["--tw-ring-color" as any]: "var(--ring)" }}
                />

                {error && (
                  <div className="text-sm px-3 py-2 rounded-lg" style={{ background: "color-mix(in srgb, var(--destructive) 10%, transparent)", color: "var(--destructive)" }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3 rounded-lg font-medium transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                >
                  Salvar nova senha
                </button>
              </form>
            )}

            <div className="flex justify-center mt-5 text-sm">
              <button onClick={() => setOpen(false)} className="transition-colors hover:opacity-70" style={{ color: "var(--muted-foreground)" }}>
                Fazer isso depois
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
