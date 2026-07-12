import {
  Home, Users, FolderOpen, Sparkles, Brain, Zap, Files, Settings,
  Code, Music, Video, Globe, Eye, Volume2, Database, Cpu, Activity,
  Heart, DollarSign, BookOpen, Languages,
} from "lucide-react";

export const BOOT_MESSAGES = [
  "Initializing Orun OS...",
  "Loading Memory Engine...",
  "Loading AI Models...",
  "Initializing Hampton...",
  "Connecting Local AI...",
  "Connecting Cloud AI...",
  "Loading Projects...",
  "Loading User Memory...",
  "Preparing Interface...",
  "System Ready.",
];

export const AGENTS = [
  { name: "Hampton", role: "Central Intelligence", icon: Brain, special: true },
  { name: "Developer", role: "Code & Engineering", icon: Code },
  { name: "Designer", role: "UI/UX & Visuals", icon: Sparkles },
  { name: "3D Designer", role: "3D & Modeling", icon: Cpu },
  { name: "Researcher", role: "Search & Analysis", icon: Globe },
  { name: "Health", role: "Health Monitoring", icon: Heart },
  { name: "Nutritionist", role: "Diet & Nutrition", icon: Activity },
  { name: "Personal Trainer", role: "Fitness & Workout", icon: Activity },
  { name: "Finance", role: "Budget & Investments", icon: DollarSign },
  { name: "Teacher", role: "Learning & Education", icon: BookOpen },
  { name: "Translator", role: "Languages & Culture", icon: Languages },
  { name: "Video Editor", role: "Video Production", icon: Video },
  { name: "Music Producer", role: "Audio & Music", icon: Music },
  { name: "Automation", role: "Workflows & Bots", icon: Zap },
  { name: "Vision", role: "Image & Camera AI", icon: Eye },
  { name: "Voice", role: "Speech & Audio", icon: Volume2 },
  { name: "Memory Manager", role: "Knowledge & Memory", icon: Database },
  { name: "System", role: "OS & Configuration", icon: Settings },
];

export const NAV_TOP = [
  { id: "home", icon: Home, label: "Home" },
  { id: "agents", icon: Users, label: "Agents" },
  { id: "projects", icon: FolderOpen, label: "Projects" },
  { id: "studio", icon: Sparkles, label: "Studio" },
  { id: "memory", icon: Brain, label: "Memory" },
  { id: "automation", icon: Zap, label: "Automation" },
  { id: "files", icon: Files, label: "Files" },
];

/** Used only in browser preview mode, when there's no Electron AI backend. */
export const HAMPTON_REPLIES = [
  "Understood. I am processing your request with full intelligence engagement across all available models.",
  "Analyzing the context now. I will provide the most precise and useful response possible.",
  "Your query has been received. Synthesizing information from all connected knowledge systems.",
  "Running deep analysis. Allow me a moment to formulate the optimal response for you.",
  "Processing complete. Here is what I found based on your request and current context.",
];

export const isElectron = typeof window !== "undefined" && !!(window as any).orun;
