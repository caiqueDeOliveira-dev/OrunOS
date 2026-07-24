import {
  Home, Users, FolderOpen, Sparkles, Brain, Zap, Files, Settings,
  Code, Music, Video, Globe, Heart, DollarSign, BookOpen, Share2, Megaphone, Car,
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
    { name: "Hampton", role: t("agentCentralIntelligence"), icon: Brain, special: true },
    { name: "Developer", role: t("agentCodeEngineering"), icon: Code },
    { name: "Designer", role: t("agentDesignVisual"), icon: Sparkles },
    { name: "Creator", role: t("agentAudiovisualContent"), icon: Video },
    { name: "Health", role: t("agentHealth"), icon: Heart },
    { name: "Finance", role: t("agentBudgetInvestments"), icon: DollarSign },
    { name: "Teacher", role: t("agentLearningLanguages"), icon: BookOpen },
    { name: "Marketing", role: t("agentMarketingSocial"), icon: Megaphone },
    { name: "Automation", role: t("agentAutomationBots"), icon: Zap },
    { name: "Automotive", role: t("agentAutomotive"), icon: Car },
    { name: "System", role: t("agentOSConfig"), icon: Settings },
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
