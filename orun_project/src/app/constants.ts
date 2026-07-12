import {
  Home, Users, FolderOpen, Sparkles, Brain, Zap, Files, Settings,
  Code, Music, Video, Globe, Eye, Volume2, Database, Cpu, Activity,
  Heart, DollarSign, BookOpen, Languages,
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
    { name: "Designer", role: t("agentUIUX"), icon: Sparkles },
    { name: "3D Designer", role: t("agent3DModeling"), icon: Cpu },
    { name: "Researcher", role: t("agentResearchAnalysis"), icon: Globe },
    { name: "Health", role: t("agentHealthMonitoring"), icon: Heart },
    { name: "Nutritionist", role: t("agentDietNutrition"), icon: Activity },
    { name: "Personal Trainer", role: t("agentFitnessTraining"), icon: Activity },
    { name: "Finance", role: t("agentBudgetInvestments"), icon: DollarSign },
    { name: "Teacher", role: t("agentLearningEducation"), icon: BookOpen },
    { name: "Translator", role: t("agentLanguagesCulture"), icon: Languages },
    { name: "Video Editor", role: t("agentVideoProduction"), icon: Video },
    { name: "Music Producer", role: t("agentAudioMusic"), icon: Music },
    { name: "Automation", role: t("agentAutomationBots"), icon: Zap },
    { name: "Vision", role: t("agentImageCamera"), icon: Eye },
    { name: "Voice", role: t("agentSpeechAudio"), icon: Volume2 },
    { name: "Memory Manager", role: t("agentKnowledgeMemory"), icon: Database },
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
