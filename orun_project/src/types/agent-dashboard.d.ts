// Ambient declarations for the vendored @orun/agent-dashboard package.
// The runtime module is bundled at build time (vite alias), so standalone
// .d.ts is provided here for typechecking.

declare module "@vendor/agent-dashboard" {
  export interface DashboardAgentState {
    id: string;
    name: string;
    icon: string;
    status: "idle" | "working" | "delivering" | "done";
    desk: { col: number; row: number };
  }

  export interface DashboardSquadState {
    squad: string;
    status: "idle" | "running" | "completed" | "failed" | "paused";
    step: { current: number; total: number; label: string };
    agents: DashboardAgentState[];
    handoff: { from: string; to: string; message: string; completedAt: string } | null;
    startedAt: string | null;
    updatedAt: string;
    completedAt?: string;
    failedAt?: string;
    runId?: string;
  }

  export interface DashboardSquadInfo {
    id: string;
    name: string;
    description: string;
    icon: string;
    agentCount: number;
    version: string;
    lastRun?: string;
    status: "idle" | "running" | "completed" | "failed";
  }

  export interface DashboardMetrics {
    totalSquads: number;
    runningSquads: number;
    completedToday: number;
    failedToday: number;
    avgExecutionTime: number;
    successRate: number;
    activeAgents: number;
    totalAgents: number;
  }

  export interface DashboardStore {
    squads: Record<string, DashboardSquadState>;
    squadList: DashboardSquadInfo[];
    metrics: DashboardMetrics | null;
    selectedSquad: string | null;
    filters: { search: string; squadFilter: string; statusFilter: string; viewMode: "grid" | "list" | "org-chart" };
    isConnected: boolean;
    lastUpdate: string | null;
    error: string | null;
    setSquadState: (squadId: string, state: DashboardSquadState) => void;
    removeSquadState: (squadId: string) => void;
    setSquadList: (list: DashboardSquadInfo[]) => void;
    setMetrics: (metrics: DashboardMetrics) => void;
    setSelectedSquad: (id: string | null) => void;
    setFilters: (filters: Partial<DashboardStore["filters"]>) => void;
    setViewMode: (mode: "grid" | "list" | "org-chart") => void;
    setConnected: (connected: boolean) => void;
    setError: (error: string | null) => void;
    updateLastUpdate: () => void;
    clearError: () => void;
  }

  export function Dashboard(props: unknown): JSX.Element;
  export function useDashboardStore(): DashboardStore;
  export function useDashboardStore<T>(selector: (state: DashboardStore) => T): T;
}
