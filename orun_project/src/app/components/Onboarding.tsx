import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "../../i18n/I18nProvider";

interface OnboardingProps {
  onComplete: () => void;
  onDontShowAgain?: () => void;
}

export default function Onboarding({ onComplete, onDontShowAgain }: OnboardingProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState("groq");
  const [apiKey, setApiKey] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; error?: string } | null>(null);

  const steps = [
    {
      id: "welcome",
      title: t("onboardingWelcome"),
      subtitle: t("onboardingWelcomeSub"),
      icon: "🌅",
      description: t("onboardingWelcomeDesc"),
    },
    {
      id: "provider",
      title: t("onboardingProvider"),
      subtitle: t("onboardingProviderSub"),
      icon: "🔑",
      description: t("onboardingProviderDesc"),
      providers: [
        { id: "groq", name: "Groq", free: true, desc: "Rápido e gratuito" },
        { id: "openrouter", name: "OpenRouter", free: true, desc: "Acesso a vários modelos" },
        { id: "github", name: "GitHub Models", free: true, desc: "Gratuito com GitHub" },
        { id: "opencodezen", name: "OpenCodeZen", free: true, desc: t("onboardingProviderFree") },
      ],
    },
    {
      id: "agent",
      title: t("onboardingAgent"),
      subtitle: t("onboardingAgentSub"),
      icon: "🤖",
      description: t("onboardingAgentDesc"),
      features: [
        t("onboardingAgentFeature1"),
        t("onboardingAgentFeature2"),
        t("onboardingAgentFeature3"),
        t("onboardingAgentFeature4"),
      ],
    },
    {
      id: "ready",
      title: t("onboardingReady"),
      subtitle: t("onboardingReadySub"),
      icon: "✨",
      description: t("onboardingReadyDesc"),
    },
  ];

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  const validateApiKey = async () => {
    if (!apiKey.trim()) return;
    setValidating(true);
    try {
      const result = await window.orun.settings.validateApiKey(selectedProvider, apiKey);
      setValidationResult({ ...result, error: result.error ?? undefined });
    } catch {
      setValidationResult({ valid: false, error: "Erro ao validar" });
    } finally {
      setValidating(false);
    }
  };

  const handleNext = async () => {
    if (step.id === "provider" && apiKey.trim()) {
      await validateApiKey();
      if (validationResult && !validationResult.valid) return;
    }
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" style={{ background: "color-mix(in srgb, var(--background) 80%, transparent)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentStep ? "bg-blue-500 w-6" : i < currentStep ? "bg-blue-500/50" : "bg-white/20"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <div className="text-6xl mb-4">{step.icon}</div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--foreground)" }}>{step.title}</h2>
            <p className="mb-6" style={{ color: "var(--muted-foreground)" }}>{step.subtitle}</p>
            <p className="mb-6" style={{ color: "var(--foreground)", opacity: 0.8 }}>{step.description}</p>

            {/* Provider selection */}
            {step.id === "provider" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {step.providers?.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => setSelectedProvider(provider.id)}
                      className="p-3 rounded-lg border transition-all"
                      style={{
                        borderColor: selectedProvider === provider.id ? "var(--primary)" : "var(--border)",
                        background: selectedProvider === provider.id ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "var(--secondary)",
                      }}
                    >
                      <div className="font-medium" style={{ color: "var(--foreground)" }}>{provider.name}</div>
                      <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{provider.desc}</div>
                      {provider.free && <div className="text-xs text-green-400 mt-1">{t("onboardingProviderFree")}</div>}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => { setApiKey(e.target.value); setValidationResult(null); }}
                    placeholder={t("onboardingApiKey")}
                    className="w-full px-4 py-3 rounded-lg focus:outline-none"
                    style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                  />
                  {validating && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {validationResult && (
                  <div className={`text-sm ${validationResult.valid ? "text-green-400" : "text-red-400"}`}>
                    {validationResult.valid ? t("onboardingKeyValid") : `${t("onboardingKeyInvalid")} ${validationResult.error}`}
                  </div>
                )}
              </div>
            )}

            {/* Agent features */}
            {step.id === "agent" && (
              <div className="grid grid-cols-2 gap-3 text-left">
                {step.features?.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "var(--secondary)" }}>
                    <span style={{ color: "var(--primary)" }}>✓</span>
                    <span className="text-sm" style={{ color: "var(--foreground)", opacity: 0.8 }}>{feature}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <div className="flex items-center gap-3">
            <button onClick={onComplete} className="px-4 py-2 transition-colors" style={{ color: "var(--muted-foreground)" }}>
              {t("onboardingSkip")}
            </button>
            {onDontShowAgain && (
              <button onClick={onDontShowAgain} className="px-3 py-1.5 text-[10px] border rounded-md transition-colors" style={{ color: "var(--muted-foreground)", borderColor: "var(--border)" }}>
                {t("onboardingDontShow")}
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {!isFirst && (
              <button onClick={() => setCurrentStep(currentStep - 1)} className="px-4 py-2 border rounded-lg transition-colors" style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>
                {t("onboardingBack")}
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={step.id === "provider" && !apiKey.trim()}
              className="px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              {isLast ? t("onboardingStart") : t("onboardingNext")}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
