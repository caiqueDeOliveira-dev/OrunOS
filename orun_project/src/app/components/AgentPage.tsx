import { useCallback } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Zap, Send, Layers } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AGENT_ENVIRONMENTS, getTranslatedEnv } from "./agentPageData";
import { HealthCharts, FinanceCharts, DeveloperCharts, TeacherCharts, CreatorCharts, DesignerCharts, MarketingCharts, NoCharts } from "./agentCharts";
import { isElectron } from "../constants";
import { useTranslation } from "../../i18n/I18nProvider";
import { hasPlugin, getWorkspacePluginId } from "../plugins/PluginRegistry";

interface Props {
  agent: string;
  onClose: () => void;
  onStartChat: (agentName: string) => void;
  onOpenWorkspace?: (agentName: string) => void;
}

// ── Floating Particles Component ──────────────────────────────────
function FloatingParticles({ particles, accent }: { particles: string[]; accent: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((emoji, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl opacity-20"
          style={{
            left: `${10 + (i * 15) % 80}%`,
            top: `${10 + (i * 17) % 80}%`,
          }}
          animate={{
            y: [0, -20, 0],
            rotate: [0, 10, -10, 0],
            opacity: [0.1, 0.25, 0.1],
          }}
          transition={{
            duration: 4 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.3,
          }}
        >
          {emoji}
        </motion.div>
      ))}
    </div>
  );
}

// ── Ambient Icons Component ───────────────────────────────────────
function AmbientIcons({ icons, accent }: { icons: LucideIcon[]; accent: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {icons.slice(0, 6).map((Icon, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${5 + (i * 16) % 90}%`,
            top: `${5 + (i * 19) % 90}%`,
          }}
          animate={{
            opacity: [0.03, 0.08, 0.03],
            scale: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 5 + i * 0.7,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        >
          <Icon size={24 + i * 4} style={{ color: accent }} />
        </motion.div>
      ))}
    </div>
  );
}

// ── Stats Card Component ──────────────────────────────────────────
function StatCard({ label, value, icon: Icon, accent, isDark }: { label: string; value: string; icon: LucideIcon; accent: string; isDark: boolean }) {
  return (
    <motion.div
      className="flex items-center gap-2 p-3 rounded-xl"
      style={{
        background: isDark ? `${accent}15` : "rgba(255,255,255,0.8)",
        border: `1px solid ${accent}20`,
        backdropFilter: "blur(10px)",
      }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="p-2 rounded-lg" style={{ background: `${accent}15` }}>
        <Icon size={14} style={{ color: accent }} />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider" style={{ color: isDark ? "#aaa" : "#718096" }}>{label}</div>
        <div className="text-sm font-bold" style={{ color: isDark ? "white" : "#1A202C", fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      </div>
    </motion.div>
  );
}

// ── Main AgentPage Component ──────────────────────────────────────

export function AgentPage({ agent, onClose, onStartChat, onOpenWorkspace }: Props) {
  const { t } = useTranslation();
  const env = getTranslatedEnv(agent, AGENT_ENVIRONMENTS[agent] || AGENT_ENVIRONMENTS.Hampton, t);
  const Icon = env.icon;
  const isDark = agent === "Hampton" || agent === "Developer";

  const pluginId = getWorkspacePluginId(agent);
  const hasWorkspace = pluginId ? hasPlugin(pluginId) : false;

  const handleQuickAction = useCallback((prompt: string) => {
    if (prompt) onStartChat(agent);
  }, [agent, onStartChat]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: isDark ? "rgba(0,0,0,0.9)" : "rgba(0,0,0,0.5)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* Immersive Background */}
      <div className="absolute inset-0" style={{ background: env.bg }} />
      <div className="absolute inset-0" style={{ background: env.pattern }} />
      
      {/* Floating Particles */}
      <FloatingParticles particles={env.particles} accent={env.accent} />
      
      {/* Ambient Icons */}
      <AmbientIcons icons={env.ambientIcons} accent={env.accent} />

      {/* Main Content */}
      <motion.div
        className="relative z-10 w-[560px] max-h-[90vh] overflow-y-auto rounded-3xl border scrollbar-hide shadow-2xl"
        style={{ 
          background: isDark ? "rgba(26,32,44,0.95)" : "rgba(255,255,255,0.85)", 
          borderColor: isDark ? `${env.accent}40` : `${env.accent}20`,
          backdropFilter: "blur(20px)",
        }}
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Agent Icon */}
        <div className="relative px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={onClose} aria-label={t("close")} className="p-2 rounded-xl transition-colors" style={{ color: isDark ? "#aaa" : "#718096", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
              <ArrowLeft size={18} />
            </button>
            {isDark && (
              <motion.div
                className="w-2 h-2 rounded-full"
                style={{ background: env.accent, boxShadow: `0 0 12px ${env.accent}` }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>

          {/* Agent Avatar */}
          <div className="flex flex-col items-center mb-4">
            <motion.div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
              style={{ 
                background: `${env.accent}15`, 
                border: `2px solid ${env.accent}30`,
                boxShadow: `0 8px 32px ${env.accent}20`,
              }}
              animate={{ 
                boxShadow: [
                  `0 8px 32px ${env.accent}20`,
                  `0 12px 40px ${env.accent}30`,
                  `0 8px 32px ${env.accent}20`,
                ],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Icon size={36} style={{ color: env.accent }} />
            </motion.div>

            <motion.h2
              className="text-xl font-bold tracking-wide mb-1"
              style={{ color: isDark ? "white" : "#1A202C", fontFamily: "'Sora', sans-serif" }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {env.description}
            </motion.h2>

            <motion.p
              className="text-xs text-center max-w-xs"
              style={{ color: isDark ? "#aaa" : "#718096" }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {env.tagline}
            </motion.p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-6 mb-4">
          <div className="grid grid-cols-4 gap-2">
            {env.stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <StatCard label={stat.label} value={stat.value} icon={stat.icon} accent={env.accent} isDark={isDark} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Charts */}
        <div className="px-6 py-4">
          {agent === "Health" && <HealthCharts accent={env.accent} />}
          {agent === "Finance" && <FinanceCharts accent={env.accent} />}
          {agent === "Developer" && <DeveloperCharts accent={env.accent} />}
          {agent === "Teacher" && <TeacherCharts accent={env.accent} />}
          {agent === "Creator" && <CreatorCharts accent={env.accent} />}
          {agent === "Designer" && <DesignerCharts accent={env.accent} />}
          {agent === "Marketing" && <MarketingCharts accent={env.accent} />}
          {(agent === "Automation" || agent === "System" || agent === "Hampton") && <NoCharts agent={agent} accent={env.accent} />}
        </div>

        {/* Quick Actions */}
        {env.quickActions.length > 0 && (
          <div className="px-6 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={12} style={{ color: isDark ? "#aaa" : "#A0AEC0" }} />
              <div className="text-[10px] uppercase tracking-wider" style={{ color: isDark ? "#aaa" : "#A0AEC0" }}>{t('agent_quick_actions_title')}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {env.quickActions.map((action, i) => (
                <motion.button
                  key={action.label}
                  onClick={() => handleQuickAction(action.prompt)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all"
                  style={{
                    background: isDark ? `${env.accent}10` : "rgba(255,255,255,0.8)",
                    border: `1px solid ${env.accent}20`,
                    color: isDark ? "white" : "#2D3748",
                  }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <action.icon size={14} style={{ color: env.accent }} />
                  <span className="text-[11px] font-medium">{action.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="px-6 pb-6 space-y-2">
          {hasWorkspace && onOpenWorkspace && (
            <motion.button
              onClick={() => onOpenWorkspace(agent)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all"
              style={{
                background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                border: `1px solid ${env.accent}30`,
                color: isDark ? "white" : env.accent,
                backdropFilter: "blur(10px)",
              }}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              <Layers size={16} />
              {t('agent_open_workspace')}
            </motion.button>
          )}
          <motion.button
            onClick={() => onStartChat(agent)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: env.accent,
              color: "white",
              boxShadow: `0 6px 20px ${env.accent}40`,
            }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Send size={16} />
            {hasWorkspace ? t('agent_chat_with_ai') : t('agent_start_session')}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
