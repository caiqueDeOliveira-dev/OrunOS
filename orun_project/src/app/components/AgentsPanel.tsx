import { motion } from "motion/react";
import { X, BarChart3 } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import { getAgents } from "../constants";

const DATA_AGENTS = ["Finance", "Health", "Developer", "Teacher", "Creator", "Designer", "Marketing"];

interface Props {
  onClose: () => void;
  onSelectAgent: (agentName: string) => void;
  onOpenAgentPage: (agentName: string) => void;
  onViewData?: (agentName: string) => void;
}

export function AgentsPanel({ onClose, onSelectAgent, onOpenAgentPage, onViewData }: Props) {
  const { t } = useTranslation();
  const AGENTS = getAgents(t);
  return (
    <motion.div
      className="fixed left-16 top-8 h-[calc(100%-2rem)] z-30 flex flex-col border-r overflow-hidden"
      style={{ width: 270, background: "var(--card)", borderColor: "var(--border)" }}
      initial={{ x: -270, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -270, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 320 }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="text-[10px] tracking-[0.24em] uppercase text-[#B5B5B5]" style={{ fontFamily: "'Sora', sans-serif" }}>
          {t("agentModelsTitle")}
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded transition-colors"
          style={{ color: "var(--muted-foreground)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#B5B5B5")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--muted-foreground)")}
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2 scrollbar-hide">
        {AGENTS.map((agent, idx) => {
          const Icon = agent.icon;
          const hasData = DATA_AGENTS.includes(agent.name);
          return (
            <motion.button
              key={agent.name}
              onClick={() => { if (!agent.special) onOpenAgentPage(agent.name); else onClose(); }}
              className="w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors group"
              style={{ color: "var(--muted-foreground)" }}
              whileHover={{ backgroundColor: "rgba(255,255,255,0.025)", color: "var(--foreground)" }}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.025 }}
            >
              <Icon size={13} style={{ color: agent.special ? "#C00018" : "inherit", flexShrink: 0 }} />
              <div className="min-w-0 flex-1">
                <div className="text-xs truncate" style={{
                  fontFamily: "'Sora', sans-serif",
                  fontWeight: agent.special ? 500 : 300,
                  color: agent.special ? "var(--foreground)" : "inherit",
                }}>
                  {agent.name}
                </div>
                <div className="text-[9px] truncate" style={{ fontFamily: "'Inter', sans-serif", color: "#3a3a3a" }}>
                  {agent.role}
                </div>
              </div>
              {hasData && onViewData && (
                <button
                  onClick={(e) => { e.stopPropagation(); onViewData(agent.name); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                  style={{ color: "var(--muted-foreground)" }}
                  title={`View ${agent.name} data`}
                >
                  <BarChart3 size={12} />
                </button>
              )}
              {agent.special && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#C00018", boxShadow: "0 0 5px #C00018" }} />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
