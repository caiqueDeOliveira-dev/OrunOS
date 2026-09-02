import {
  IconDashboard,
  IconCombos,
  IconProviders,
  IconUsage,
  IconHealth,
  IconConsole,
  IconChat,
  IconTokenSaver,
  IconTranslator,
  IconProxyPool,
  IconTunnel,
  IconCli,
  IconSettings,
} from "./components/icons";

export const NAV = [
  {
    title: "CORE",
    items: [
      { id: "home", label: "Dashboard", icon: IconDashboard },
      { id: "combos", label: "Combos", icon: IconCombos },
      { id: "providers", label: "Providers", icon: IconProviders },
      { id: "usage", label: "Usage", icon: IconUsage },
      { id: "health", label: "Health", icon: IconHealth },
    ],
  },
  {
    title: "TOOLS",
    items: [
      { id: "console", label: "Console", icon: IconConsole },
      { id: "chat", label: "Chat", icon: IconChat },
      { id: "token-saver", label: "Token Saver", icon: IconTokenSaver },
      { id: "translator", label: "Translator", icon: IconTranslator },
    ],
  },
  {
    title: "NETWORK",
    items: [
      { id: "proxy-pool", label: "Proxy Pool", icon: IconProxyPool },
      { id: "tunnel", label: "Tunnel", icon: IconTunnel },
    ],
  },
  {
    title: "CONFIG",
    items: [
      { id: "cli-tools", label: "CLI Tools", icon: IconCli },
      { id: "settings", label: "Settings", icon: IconSettings },
    ],
  },
];
