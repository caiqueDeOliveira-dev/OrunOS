// Central workspace action registry
// Each workspace registers its action handlers here.
// The main process sends workspace:action IPC, this module dispatches to the right handler.

export interface WorkspaceActionRequest {
  requestId: string;
  workspace: string;
  action: string;
  params: Record<string, unknown>;
}

export interface WorkspaceActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
}

type ActionHandler = (params: Record<string, unknown>) => Promise<WorkspaceActionResult> | WorkspaceActionResult;

const registry: Record<string, Record<string, ActionHandler>> = {};

let initialized = false;
let unsubscribe: (() => void) | null = null;

export function registerWorkspaceActions(
  workspaceId: string,
  actions: Record<string, ActionHandler>
) {
  registry[workspaceId] = { ...registry[workspaceId], ...actions };
}

export function unregisterWorkspaceActions(workspaceId: string) {
  delete registry[workspaceId];
}

async function dispatch(request: WorkspaceActionRequest): Promise<WorkspaceActionResult> {
  const { workspace, action, params } = request;
  const wsActions = registry[workspace];
  if (!wsActions) {
    return { success: false, error: `Workspace "${workspace}" is not open or has no registered actions` };
  }
  const handler = wsActions[action];
  if (!handler) {
    const available = Object.keys(wsActions);
    return { success: false, error: `Unknown action "${action}" for workspace "${workspace}". Available: ${available.join(", ")}` };
  }
  try {
    const result = await handler(params);
    return result;
  } catch (e: any) {
    return { success: false, error: e.message || "Action failed" };
  }
}

export function initWorkspaceActionListener() {
  if (initialized) return;
  if (!window.orun?.workspaceActions) return;
  initialized = true;

  unsubscribe = window.orun.workspaceActions.onAction(async (request: WorkspaceActionRequest) => {
    const result = await dispatch(request);
    window.orun.workspaceActions.sendResult(request.requestId, result);
  });
}

export function destroyWorkspaceActionListener() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
    initialized = false;
  }
}
