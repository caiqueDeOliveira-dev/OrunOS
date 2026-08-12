import { useState, FormEvent } from "react";
import { motion } from "motion/react";

interface LoginScreenProps {
  onDone: (state: { status: string }) => void;
  onSkip: () => void;
}

type Mode = "signin" | "signup";

export function LoginScreen({ onDone, onSkip }: LoginScreenProps) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const state = await window.orun.auth.signIn(email.trim(), password);
        if (state.status !== "authenticated") setInfo("Confirme o e-mail ou complete o segundo fator.");
        else onDone(state);
      } else {
        const state = await window.orun.auth.signUp(email.trim(), password, displayName.trim() || undefined);
        if (state.status !== "authenticated") {
          setMode("signin");
          setInfo("Conta criada. Confirme o link enviado ao seu e-mail para ativar o login.");
        } else onDone(state);
      }
    } catch (err: any) {
      setError(err?.message || "Não foi possível concluir. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--input)",
    border: "1px solid var(--border)",
    color: "var(--foreground)",
  };

  return (
    <motion.div
      className="fixed inset-0 overflow-hidden flex items-center justify-center"
      style={{ background: "var(--background)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="w-full max-w-md mx-4 rounded-2xl p-8"
        style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-3" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
            🌅
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Orun OS</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            {mode === "signin" ? "Entre com sua conta Orun" : "Crie sua conta Orun"}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nome de exibição"
              className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2"
              style={{ ...inputStyle, ["--tw-ring-color" as any]: "var(--ring)" }}
            />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            autoComplete="email"
            className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2"
            style={{ ...inputStyle, ["--tw-ring-color" as any]: "var(--ring)" }}
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2"
            style={{ ...inputStyle, ["--tw-ring-color" as any]: "var(--ring)" }}
          />

          {error && (
            <div className="text-sm px-3 py-2 rounded-lg" style={{ background: "color-mix(in srgb, var(--destructive) 10%, transparent)", color: "var(--destructive)" }}>
              {error}
            </div>
          )}
          {info && (
            <div className="text-sm px-3 py-2 rounded-lg" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: "var(--primary)" }}>
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-lg font-medium transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            {busy && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {mode === "signin" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <div className="flex items-center justify-between mt-6 text-sm">
          <button
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setInfo(null); }}
            className="transition-colors hover:opacity-70"
            style={{ color: "var(--primary)" }}
          >
            {mode === "signin" ? "Criar conta" : "Já tenho conta"}
          </button>
          <button onClick={onSkip} className="transition-colors hover:opacity-70" style={{ color: "var(--muted-foreground)" }}>
            Continuar sem conta
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
