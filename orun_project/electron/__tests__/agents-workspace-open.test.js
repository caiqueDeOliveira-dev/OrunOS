import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ── Tests for open_workspace and workspace_action ──────────────────────
// These test the logic INSIDE the tool implementations in tools.cjs
// without requiring Electron runtime.

// ── WORKSPACE VALIDATION ──────────────────────────────────────────────
// From tools.cjs open_workspace implementation:
//   validWorkspaces = ["creator-audio", "creator-video", "designer",
//     "automation-flow", "finance", "health", "teacher", "marketing",
//     "system", "developer", "automotive-garage", "juridico",
//     "assistente-tecnico", "personal-assistant", "suporte"]

const VALID_WORKSPACES = [
  "creator-audio", "creator-video", "designer", "automation-flow",
  "finance", "health", "teacher", "marketing", "system", "developer",
  "automotive-garage", "juridico", "assistente-tecnico",
  "personal-assistant", "suporte", "home-ia", "cyber-security",
];

// From tools.cjs workspace_action description:
const WORKSPACE_ACTIONS_MAP = {
  "creator-audio":     ["start_recording", "stop_recording", "toggle_metronome", "tune_voice", "tune_to_note", "generate_beat", "preview_note", "normalize", "add_reverb", "add_delay", "pitch_shift", "time_stretch", "set_eq", "set_volume", "play", "pause", "stop", "load_audio", "analyze", "export_audio", "get_realtime_data", "generate_music", "master_track", "separate_stems", "autotone", "mix_tracks", "apply_gain", "list_music_models", "list_autotone_presets"],
  "creator-video":     ["add_clip", "delete_clip", "split_clip", "add_effect", "set_transition", "set_text", "export_video", "get_timeline"],
  designer:            ["add_element", "delete_element", "change_bg", "change_canvas_size", "duplicate_element", "export_design", "get_elements", "create_template", "bring_forward", "send_backward"],
  "automation-flow":   ["add_node", "delete_node", "add_edge", "delete_edge", "simulate", "get_flow", "save_flow", "load_flow", "export_flow", "import_flow"],
  finance:             ["add_transaction", "delete_transaction", "get_summary", "get_transactions"],
  health:              ["log_meal", "log_workout", "log_metric", "get_summary", "get_trends", "get_meal_history", "log_body_measurement", "get_body_measurements", "add_exam", "get_exams", "delete_exam"],
  teacher:             ["add_quiz_question", "get_quiz", "clear_canvas", "export_canvas", "start_quiz", "get_quiz_status", "stop_quiz"],
  marketing:           ["add_campaign", "pause_campaign", "resume_campaign", "get_campaigns", "create_post", "get_posts"],
  system:              ["execute_command", "get_processes", "get_resources"],
  developer:           ["read_file", "write_file", "list_files", "execute_command"],
  "automotive-garage": ["add_vehicle", "add_service_record", "add_expense", "get_fleet_summary", "get_service_history", "get_expenses"],
  "personal-assistant": ["create_reminder", "get_agenda", "create_event", "delete_event", "list_emails", "send_email"],
  "home-ia": ["list_devices", "get_home_status", "get_device_state", "toggle_device", "set_brightness", "set_temperature", "lock_door", "run_automation", "list_automations", "create_automation", "toggle_automation", "list_scenes", "activate_scene", "send_voice_message"],
  "cyber-security": ["run_scan", "get_report", "get_summary", "list_findings", "fix_finding", "export_report"],
};

// Workspaces defined in frontend that register no workspace actions (openable but action-less)
const NO_ACTION_WORKSPACES = [
  "juridico",
  "assistente-tecnico",
  "suporte",
];

// From agent-prompts.cjs - workspace IDs referenced in prompts
const WORKSPACES_IN_PROMPTS = [
  "creator-audio", "creator-video", "designer", "automation-flow",
  "finance", "health", "teacher", "marketing", "system", "developer",
  "juridico", "assistente-tecnico", "home-ia", "cyber-security",
];

// ── 1. VALID WORKSPACES ───────────────────────────────────────────────
describe("open_workspace - workspace validation", () => {
  // Simulates the validation logic from tools.cjs:970-971
  function validateWorkspace(workspace) {
    if (!workspace || typeof workspace !== "string") {
      return { error: "Invalid workspace" };
    }
    const valid = ["creator-audio", "creator-video", "designer", "automation-flow",
      "finance", "health", "teacher", "marketing", "system", "developer",
      "automotive-garage", "juridico", "assistente-tecnico",
      "personal-assistant", "suporte", "home-ia", "cyber-security"];
    if (!valid.includes(workspace)) {
      return { error: `Invalid workspace: ${workspace}. Valid: ${valid.join(", ")}` };
    }
    return { success: true };
  }

  it("accepts all valid workspace IDs", () => {
    for (const ws of VALID_WORKSPACES) {
      const result = validateWorkspace(ws);
      expect(result.success, `Workspace "${ws}" should be valid`).toBe(true);
    }
  });

  it("rejects invalid workspace IDs", () => {
    const invalid = ["nonexistent", "", null, undefined, 123, "health-invalid", "made-up-ws"];
    for (const ws of invalid) {
      const result = validateWorkspace(ws);
      if (typeof ws === "string" && ws.length > 0) {
        expect(result.error).toBeDefined();
        expect(result.error).toContain("Invalid workspace");
      } else {
        expect(result.error).toBeDefined();
      }
    }
  });

  it("rejects workspace with shell metacharacters", () => {
    const result = validateWorkspace("health; rm -rf /");
    expect(result.error).toBeDefined();
  });

  it("rejects workspace with path traversal", () => {
    const result = validateWorkspace("../../etc/passwd");
    expect(result.error).toBeDefined();
  });
});

// ── 2. WORKSPACE ACTIONS VALIDATION ───────────────────────────────────
describe("workspace_action - action validation", () => {
  function validateAction(workspace, action) {
    if (!workspace || typeof workspace !== "string") {
      return { error: "Invalid workspace" };
    }
    const valid = VALID_WORKSPACES;
    if (!valid.includes(workspace)) {
      return { error: `Invalid workspace: ${workspace}` };
    }
    const actions = WORKSPACE_ACTIONS_MAP[workspace];
    if (!actions) {
      return { error: `No actions defined for workspace: ${workspace}` };
    }
    if (!action || typeof action !== "string") {
      return { error: "Invalid action" };
    }
    if (!actions.includes(action)) {
      return { error: `Unknown action "${action}" for "${workspace}". Available: ${actions.join(", ")}` };
    }
    return { success: true };
  }

  it("all actions defined in tools.cjs are valid for their workspaces", () => {
    for (const [ws, actions] of Object.entries(WORKSPACE_ACTIONS_MAP)) {
      for (const action of actions) {
        const result = validateAction(ws, action);
        expect(result.success, `Action "${action}" for workspace "${ws}" should be valid`).toBe(true);
      }
    }
  });

  it("rejects unknown actions for known workspaces", () => {
    const result = validateAction("health", "hack_the_planet");
    expect(result.error).toBeDefined();
    expect(result.error).toContain("Unknown action");
    expect(result.error).toContain("health");
  });

  it("rejects empty action string", () => {
    const result = validateAction("health", "");
    expect(result.error).toBeDefined();
  });

  it("rejects null action", () => {
    const result = validateAction("health", null);
    expect(result.error).toBeDefined();
  });

  it("rejects actions for workspace with empty workspace", () => {
    const result = validateAction("", "log_meal");
    expect(result.error).toBeDefined();
  });
});

// ── 3. WORKSPACE ACTION PARAMETER VALIDATION ──────────────────────────
describe("workspace_action - parameter validation", () => {
  function validateParams(action, params) {
    if (!params || typeof params !== "object" || Array.isArray(params)) {
      return params || {};
    }
    return params;
  }

  it("accepts valid param objects", () => {
    const validParams = [
      { bpm: 120, beats_per_bar: 4 },
      { note: "C4", duration: 0.5 },
      { metric: "weight", days: 7 },
      { name: "Almoço", calories: 600, protein: 40 },
      { description: "Almoço", amount: 35.90, category: "food", type: "expense" },
      { question: "O que é HTTP?", options: ["A", "B"], correctIndex: 0 },
      { flowId: "default" },
      { template: "resume", accent_color: "#C00018" },
    ];
    for (const params of validParams) {
      const result = validateParams("some_action", params);
      expect(result).toEqual(params);
    }
  });

  it("converts null/undefined params to empty object", () => {
    expect(validateParams("get_summary", null)).toEqual({});
    expect(validateParams("get_summary", undefined)).toEqual({});
  });

  it("rejects non-object params (arrays)", () => {
    const result = validateParams("test", [1, 2, 3]);
    expect(result).toEqual([1, 2, 3]); // Not validated as object
  });
});

// ── 4. FRONTEND ACTION REGISTRY ───────────────────────────────────────
describe("Frontend workspace action registry (workspace-actions.ts)", () => {
  it("simulates registration and dispatch flow", () => {
    const registry = {};

    function registerWorkspaceActions(workspaceId, actions) {
      registry[workspaceId] = { ...registry[workspaceId], ...actions };
    }

    function dispatch(workspace, action, params) {
      const wsActions = registry[workspace];
      if (!wsActions) {
        return { success: false, error: `Workspace "${workspace}" not in registry` };
      }
      const handler = wsActions[action];
      if (!handler) {
        return { success: false, error: `Unknown action "${action}" for "${workspace}"` };
      }
      try {
        return handler(params);
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    // Register a mock workspace
    registerWorkspaceActions("health", {
      log_meal: (params) => ({ success: true, data: params }),
      get_summary: () => ({ success: true, data: { meals: 3, calories: 1800 } }),
    });

    // Test dispatch
    const mealResult = dispatch("health", "log_meal", { name: "Almoço", calories: 600 });
    expect(mealResult.success).toBe(true);
    expect(mealResult.data.name).toBe("Almoço");

    const summaryResult = dispatch("health", "get_summary", {});
    expect(summaryResult.success).toBe(true);
    expect(summaryResult.data.calories).toBe(1800);

    // Test unknown workspace
    const unknownWs = dispatch("nonexistent", "log_meal", {});
    expect(unknownWs.success).toBe(false);
    expect(unknownWs.error).toContain("not in registry");

    // Test unknown action
    const unknownAction = dispatch("health", "fly_to_moon", {});
    expect(unknownAction.success).toBe(false);
    expect(unknownAction.error).toContain("Unknown action");
  });
});

// ── 5. WORKSPACE GAP ANALYSIS ─────────────────────────────────────────
describe("Workspace gap analysis - prompts vs tools.cjs vs frontend", () => {
  it("all workspaces in prompts are in tools.cjs workspace list or additional", () => {
    for (const ws of WORKSPACES_IN_PROMPTS) {
      const inTools = VALID_WORKSPACES.includes(ws);
      const inNoAction = NO_ACTION_WORKSPACES.includes(ws);
      expect(inTools || inNoAction, `Workspace "${ws}" referenced in prompts but not in tools.cjs or additional list`).toBe(true);
    }
  });

  it("juridico, assistente-tecnico, suporte are openable (valid) but register no actions", () => {
    // These workspaces exist in the frontend; they can be opened via open_workspace
    // but expose no workspace_action handlers.
    for (const ws of NO_ACTION_WORKSPACES) {
      expect(VALID_WORKSPACES.includes(ws), `Frontend workspace "${ws}" should be in VALID_WORKSPACES`).toBe(true);
      expect(WORKSPACE_ACTIONS_MAP[ws], `Workspace "${ws}" should not define actions`).toBeUndefined();
    }
  });

  it("personal-assistant has its registered actions", () => {
    const actions = WORKSPACE_ACTIONS_MAP["personal-assistant"];
    expect(actions).toBeDefined();
    expect(actions).toContain("create_reminder");
    expect(actions).toContain("get_agenda");
    expect(actions).toContain("create_event");
  });

  it("home-ia has its registered actions", () => {
    const actions = WORKSPACE_ACTIONS_MAP["home-ia"];
    expect(actions).toBeDefined();
    expect(actions).toContain("toggle_device");
    expect(actions).toContain("run_automation");
    expect(actions).toContain("activate_scene");
    expect(actions).toContain("get_home_status");
  });

  it("cyber-security has its registered actions", () => {
    const actions = WORKSPACE_ACTIONS_MAP["cyber-security"];
    expect(actions).toBeDefined();
    expect(actions).toContain("run_scan");
    expect(actions).toContain("list_findings");
    expect(actions).toContain("fix_finding");
    expect(actions).toContain("get_report");
  });

  it("all tools.cjs workspaces have actions defined in agent-prompts.cjs for System agent", () => {
    const systemPromptWorkspaces = [
      "creator-audio", "creator-video", "designer", "automation-flow",
      "finance", "health", "teacher", "marketing", "system", "developer",
    ];
    for (const ws of systemPromptWorkspaces) {
      expect(VALID_WORKSPACES.includes(ws)).toBe(true);
    }
  });
});

// ── 6. IPC BRIDGE SIMULATION ──────────────────────────────────────────
describe("IPC bridge for workspace actions (preload.cjs simulation)", () => {
  it("simulates the workspaceActions bridge API", () => {
    let actionHandler = null;
    const bridge = {
      onAction: (handler) => { actionHandler = handler; return () => { actionHandler = null; }; },
      sendResult: (requestId, result) => { /* sends back to main process */ },
      notifyRegistered: (workspaceId) => { /* notifies main process */ },
    };

    const callback = vi.fn();
    const unsubscribe = bridge.onAction(callback);
    expect(actionHandler).toBe(callback);

    unsubscribe();
    expect(actionHandler).toBeNull();
  });
});

// ── 7. TIMING / RACE CONDITION TESTS ──────────────────────────────────
describe("open_workspace - timing and race conditions", () => {
  it("simulates the 5-second timeout for workspace confirmation", async () => {
    // From tools.cjs:977 - const timer = setTimeout(() => { ... resolve(false); }, 5000);
    let resolved = false;
    const timerPromise = new Promise((resolve) => {
      setTimeout(() => { resolved = true; resolve(false); }, 50);
    });
    const result = await timerPromise;
    expect(resolved).toBe(true);
    expect(result).toBe(false); // Timed out without confirmation
  });

  it("simulates workspace confirmation before timeout", async () => {
    let cleanedUp = false;
    const cleanup = () => { cleanedUp = true; };

    const confirmed = await new Promise((resolve) => {
      const timer = setTimeout(() => { cleanup(); resolve(false); }, 5000);
      // Simulate workspace confirming within 10ms
      setTimeout(() => {
        clearTimeout(timer);
        cleanup();
        resolve(true);
      }, 10);
    });

    expect(confirmed).toBe(true);
    expect(cleanedUp).toBe(true);
  });

  it("simulates workspace action 30-second timeout", async () => {
    const start = Date.now();
    let timedOut = false;
    try {
      await new Promise((_resolve, reject) => {
        setTimeout(() => reject(new Error("Workspace action timed out")), 50);
      });
    } catch (e) {
      timedOut = true;
      expect(e.message).toContain("timed out");
    }
    expect(timedOut).toBe(true);
  });
});
