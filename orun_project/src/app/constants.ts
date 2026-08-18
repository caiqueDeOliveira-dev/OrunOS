import {
  Home, Users, FolderOpen, Sparkles, Brain, Zap, Files, Settings,
  Code, Music, Video, Globe, Heart, DollarSign, BookOpen, Share2, Megaphone, Car,
  Scale, Wrench, LifeBuoy, MessageSquare, MessageSquareText, Shield, House, Gamepad2, Briefcase,
} from "lucide-react";
import type { translations } from "../i18n/translations";

type T = (key: keyof typeof translations["pt"]) => string;

export function getBootMessages(t: T) {
  return [
    t("bootInitializing"),
    t("bootMemoryEngine"),
    t("bootAIModels"),
    t("bootInitializingHampton"),
    t("bootConnectingLocal"),
    t("bootConnectingCloud"),
    t("bootLoadingProjects"),
    t("bootLoadingUserMemory"),
    t("bootPreparingInterface"),
    t("bootSystemReady"),
  ];
}

export function getAgents(t: T) {
  return [
    { name: "Hampton", persona: "Hampton", role: t("agentCentralIntelligence"), icon: Brain, special: true },
    { name: "Developer", persona: "Rebouças", role: t("agentCodeEngineering"), icon: Code },
    { name: "Designer", persona: "Abdias", role: t("agentDesignVisual"), icon: Sparkles },
    { name: "Creator", persona: "Pixinguinha", role: t("agentAudiovisualContent"), icon: Video },
    { name: "Health", persona: "Juliano", role: t("agentHealth"), icon: Heart },
    { name: "Finance", persona: "Conceição", role: t("agentBudgetInvestments"), icon: DollarSign },
    { name: "Teacher", persona: "Firmina", role: t("agentLearningLanguages"), icon: BookOpen },
    { name: "Marketing", persona: "Machado", role: t("agentMarketingSocial"), icon: Megaphone },
    { name: "Automation", persona: "Sônia", role: t("agentAutomationBots"), icon: Zap },
    { name: "Automotive", persona: "Teodoro", role: t("agentAutomotive"), icon: Car },
    { name: "System", persona: "Milton", role: t("agentOSConfig"), icon: Settings },
    { name: "Juridico", persona: "Luiz Gama", role: t("agentJuridico"), icon: Scale },
    { name: "AssistenteTecnico", persona: "João Cândido", role: t("agentAssistenteTecnico"), icon: Wrench },
    { name: "Suporte", persona: "Lélia", role: t("agentSuporte"), icon: LifeBuoy },
    { name: "Personal Assistant", persona: "Carolina", role: t("agentPersonalAssistant"), icon: MessageSquare },
    { name: "Home IA", persona: "Dandara", role: t("agentHomeIA"), icon: House },
    { name: "Cyber Security", persona: "Zumbi", role: t("agentCyberSecurity"), icon: Shield },
    { name: "CaOS Commander", persona: "CaOS Commander", role: t("agentCaOSCommander"), icon: Gamepad2 },
    { name: "Carreiras", persona: "Irene", role: t("agentCarreiras"), icon: Briefcase },
  ];
}

export function getNavTop(t: T) {
  return [
    { id: "home", icon: Home, label: t("navHome") },
    { id: "agents", icon: Users, label: t("navAgents") },
    { id: "projects", icon: FolderOpen, label: t("navProjects") },
    { id: "studio", icon: Sparkles, label: t("navStudio") },
    { id: "memory", icon: Brain, label: t("navMemory") },
    { id: "automation", icon: Zap, label: t("navAutomation") },
    { id: "files", icon: Files, label: t("navFiles") },
    { id: "groupFeed", icon: MessageSquareText, label: t("navGroupFeed") },
  ];
}

/** Used only in browser preview mode, when there's no Electron AI backend. */
export function getHamptonReplies(t: T) {
  return [
    t("reply1"),
    t("reply2"),
    t("reply3"),
    t("reply4"),
    t("reply5"),
  ];
}

export const isElectron = typeof window !== "undefined" && !!(window as any).orun;
