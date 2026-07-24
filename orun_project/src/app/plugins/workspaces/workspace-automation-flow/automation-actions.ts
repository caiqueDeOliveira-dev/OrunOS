import { registerWorkspaceActions, unregisterWorkspaceActions } from "../../lib/workspace-actions";

const WORKSPACE_ID = "automation-flow";

let registered = false;

interface FlowNode { id: string; type: string; label: string; icon: string; x: number; y: number; status?: string; }
interface FlowEdge { id: string; from: string; to: string; label?: string; }
interface FlowLog { id: string; message: string; timestamp: string | number; nodeId?: string; status?: "success" | "error"; }
interface FlowState {
  nodes: FlowNode[];
  edges: FlowEdge[];
  logs: FlowLog[];
  isRunning: boolean;
}
interface FlowStore {
  getState: () => FlowState;
  setState: (state: Partial<FlowState> | ((s: FlowState) => Partial<FlowState>)) => void;
}

let getStore: (() => FlowStore) | null = null;
export function setFlowStoreGetter(getter: () => FlowStore) { getStore = getter; }

function getFlowState() {
  if (!getStore) throw new Error("Flow store not initialized");
  return getStore();
}

let nodeIdCounter = 0;
let edgeIdCounter = 0;
function nextNodeId() { return `fn_${Date.now()}_${++nodeIdCounter}`; }
function nextEdgeId() { return `fe_${Date.now()}_${++edgeIdCounter}`; }

const NODE_ICONS: Record<string, string> = {
  trigger: "🎯",
  condition: "❓",
  action: "⚡",
};

const actions = {
  async add_node(params: Record<string, unknown>) {
    const type = (params.type as string) || "action";
    const label = String(params.label || "New Node");
    const x = typeof params.x === "number" ? params.x : 100 + Math.random() * 200;
    const y = typeof params.y === "number" ? params.y : 60 + Math.random() * 150;

    const newNode = {
      id: nextNodeId(),
      type,
      label,
      icon: NODE_ICONS[type] || "⚡",
      x,
      y,
      status: "idle" as const,
    };

    const store = getFlowState();
    store.setState((s: FlowState) => ({ nodes: [...s.nodes, newNode] }));

    return { success: true, data: newNode, message: `Added ${type} node "${label}"` };
  },

  async delete_node(params: Record<string, unknown>) {
    const nodeId = String(params.nodeId || "");
    if (!nodeId) return { success: false, error: "nodeId is required" };

    const store = getFlowState();
    const state = store.getState();
    const exists = state.nodes.some((n: FlowNode) => n.id === nodeId);
    if (!exists) return { success: false, error: `Node "${nodeId}" not found` };

    store.setState((s: FlowState) => ({
      nodes: s.nodes.filter((n: FlowNode) => n.id !== nodeId),
      edges: s.edges.filter((e: FlowEdge) => e.from !== nodeId && e.to !== nodeId),
    }));

    return { success: true, message: `Deleted node "${nodeId}" and its connections` };
  },

  async add_edge(params: Record<string, unknown>) {
    const sourceId = String(params.sourceId || "");
    const targetId = String(params.targetId || "");
    const label = typeof params.label === "string" ? params.label : undefined;

    if (!sourceId || !targetId) return { success: false, error: "sourceId and targetId are required" };
    if (sourceId === targetId) return { success: false, error: "Cannot connect a node to itself" };

    const store = getFlowState();
    const state = store.getState();

    const sourceExists = state.nodes.some((n: FlowNode) => n.id === sourceId);
    const targetExists = state.nodes.some((n: FlowNode) => n.id === targetId);
    if (!sourceExists) return { success: false, error: `Source node "${sourceId}" not found` };
    if (!targetExists) return { success: false, error: `Target node "${targetId}" not found` };

    const duplicate = state.edges.some((e: FlowEdge) => e.from === sourceId && e.to === targetId);
    if (duplicate) return { success: false, error: "Edge already exists between these nodes" };

    const newEdge = { id: nextEdgeId(), from: sourceId, to: targetId, label };
    store.setState((s: FlowState) => ({ edges: [...s.edges, newEdge] }));

    return { success: true, data: newEdge, message: `Connected "${sourceId}" → "${targetId}"` };
  },

  async delete_edge(params: Record<string, unknown>) {
    const edgeId = String(params.edgeId || "");
    if (!edgeId) return { success: false, error: "edgeId is required" };

    const store = getFlowState();
    const state = store.getState();
    const exists = state.edges.some((e: FlowEdge) => e.id === edgeId);
    if (!exists) return { success: false, error: `Edge "${edgeId}" not found` };

    store.setState((s: FlowState) => ({
      edges: s.edges.filter((e: FlowEdge) => e.id !== edgeId),
    }));

    return { success: true, message: `Deleted edge "${edgeId}"` };
  },

  async simulate() {
    const store = getFlowState();
    const state = store.getState();

    if (state.isRunning) return { success: false, error: "Simulation already running" };

    store.setState({ isRunning: true });

    const nodes = [...state.nodes];
    const timestamp = new Date().toLocaleTimeString("pt-BR");

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      store.setState((s: FlowState) => ({
        nodes: s.nodes.map((n: FlowNode) => n.id === node.id ? { ...n, status: "running" } : n),
      }));

      await new Promise((r) => setTimeout(r, 400));

      store.setState((s: FlowState) => ({
        nodes: s.nodes.map((n: FlowNode) => n.id === node.id ? { ...n, status: "done" } : n),
        logs: [...s.logs, {
          id: `log-${Date.now()}-${i}`,
          timestamp,
          nodeId: node.id,
          message: `${node.label} executado com sucesso`,
          status: "success" as const,
        }],
      }));
    }

    store.setState({ isRunning: false });

    return { success: true, message: `Simulation completed: ${nodes.length} nodes executed` };
  },

  async get_flow() {
    const store = getFlowState();
    const state = store.getState();

    return {
      success: true,
      data: {
        nodes: state.nodes,
        edges: state.edges,
        logs: state.logs,
        isRunning: state.isRunning,
      },
    };
  },

  async save_flow(params: Record<string, unknown>) {
    const flowId = String(params.flowId || "default");
    const store = getFlowState();
    const state = store.getState();
    const data = { nodes: state.nodes, edges: state.edges };
    localStorage.setItem(`orun-automation-flow-${flowId}`, JSON.stringify(data));
    return { success: true, message: `Flow saved (${state.nodes.length} nodes, ${state.edges.length} edges)` };
  },

  async load_flow(params: Record<string, unknown>) {
    const flowId = String(params.flowId || "default");
    const raw = localStorage.getItem(`orun-automation-flow-${flowId}`);
    if (!raw) return { success: false, error: `No saved flow found for "${flowId}"` };
    const data = JSON.parse(raw);
    const store = getFlowState();
    store.setState({ nodes: data.nodes || [], edges: data.edges || [] });
    return { success: true, data, message: `Flow loaded (${(data.nodes || []).length} nodes, ${(data.edges || []).length} edges)` };
  },

  async export_flow(params: Record<string, unknown>) {
    const flowId = String(params.flowId || "default");
    const store = getFlowState();
    const state = store.getState();
    const data = { nodes: state.nodes, edges: state.edges, exportedAt: new Date().toISOString() };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `automation-flow-${flowId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return { success: true, message: `Flow exported as "${a.download}"` };
  },

  async import_flow(params: Record<string, unknown>) {
    const json = String(params.json || "");
    if (!json) return { success: false, error: "json param is required" };
    const data = JSON.parse(json);
    const store = getFlowState();
    store.setState({ nodes: data.nodes || [], edges: data.edges || [] });
    return { success: true, data, message: `Flow imported (${(data.nodes || []).length} nodes, ${(data.edges || []).length} edges)` };
  },
};

export async function saveFlow(flowId = "default") {
  const store = getFlowState();
  const state = store.getState();
  const data = { nodes: state.nodes, edges: state.edges };
  localStorage.setItem(`orun-automation-flow-${flowId}`, JSON.stringify(data));
  return { success: true, message: `Flow saved (${state.nodes.length} nodes, ${state.edges.length} edges)` };
}

export async function loadFlow(flowId = "default") {
  const raw = localStorage.getItem(`orun-automation-flow-${flowId}`);
  if (!raw) return { success: false, error: `No saved flow found for "${flowId}"` };
  const data = JSON.parse(raw);
  const store = getFlowState();
  store.setState({ nodes: data.nodes || [], edges: data.edges || [] });
  return { success: true, data, message: `Flow loaded (${(data.nodes || []).length} nodes, ${(data.edges || []).length} edges)` };
}

export async function exportFlow(flowId = "default") {
  const store = getFlowState();
  const state = store.getState();
  const data = { nodes: state.nodes, edges: state.edges, exportedAt: new Date().toISOString() };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `automation-flow-${flowId}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return { success: true, message: `Flow exported as "${a.download}"` };
}

export async function importFlow(json: string) {
  if (!json) return { success: false, error: "json param is required" };
  const data = JSON.parse(json);
  const store = getFlowState();
  store.setState({ nodes: data.nodes || [], edges: data.edges || [] });
  return { success: true, data, message: `Flow imported (${(data.nodes || []).length} nodes, ${(data.edges || []).length} edges)` };
}

export function registerAutomationActions() {
  if (registered) return;
  registered = true;
  registerWorkspaceActions(WORKSPACE_ID, actions);
}

export function unregisterAutomationActions() {
  if (!registered) return;
  registered = false;
  unregisterWorkspaceActions(WORKSPACE_ID);
}
