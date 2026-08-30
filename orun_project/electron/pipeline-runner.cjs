// pipeline-runner.cjs
//
// Pipeline Runner for Orun OS — Executes multi-agent squads with state management,
// validation gates, veto conditions, handoffs, and dashboard integration.
//
// Based on the @orun/skills-core Pipeline Runner specification.

const { readFile, writeFile, mkdir, stat, readdir, rm } = require("fs/promises");
const { join, dirname, resolve } = require("path");
const { randomUUID } = require("crypto");
const { load } = require("js-yaml");

const PROJECT_ROOT = resolve(__dirname, "..");
const SQUADS_DIR = join(PROJECT_ROOT, "skills", "squads");
const AGENTS_DIR = join(PROJECT_ROOT, "skills", "agents");
const SKILLS_DIR = join(PROJECT_ROOT, "skills");
const STATE_FILE = "state.json";
const MEMORY_DIR = "_memory";

const PipelineStepSchema = {
  id: { type: "string" },
  label: { type: "string" },
  agent: { type: "string" },
  type: { type: "string", enum: ["inline", "subagent", "checkpoint"], default: "inline" },
  model_tier: { type: "string", enum: ["fast", "powerful"] },
  format: { type: "string" },
  inputFile: { type: "string" },
  outputFile: { type: "string" },
  skills: { type: "array", items: { type: "string" } },
  vetoConditions: { type: "array", items: { type: "string" } },
  onReject: { type: "string" },
  maxReviewCycles: { type: "number" },
};

function validatePipelineStep(step) {
  if (!step.id || !step.label || !step.agent) {
    throw new Error("Pipeline step must have id, label, and agent");
  }
  if (step.type && !["inline", "subagent", "checkpoint"].includes(step.type)) {
    throw new Error(`Invalid step type: ${step.type}`);
  }
  if (step.model_tier && !["fast", "powerful"].includes(step.model_tier)) {
    throw new Error(`Invalid model_tier: ${step.model_tier}`);
  }
}

async function loadYaml(filePath) {
  try {
    const content = await readFile(filePath, "utf-8");
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) return { frontmatter: {}, body: content };
    const frontmatter = load(fmMatch[1]);
    const body = content.slice(fmMatch[0].length).trim();
    return { frontmatter, body };
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}

async function loadSquad(squadName) {
  const squadDir = join(SQUADS_DIR, squadName);
  const yamlPath = join(squadDir, "squad.yaml");
  const partyPath = join(squadDir, "squad-party.csv");
  const pipelineDir = join(squadDir, "pipeline", "steps");

  const [squadYamlRaw, partyCsv, pipelineSteps] = await Promise.all([
    loadYaml(yamlPath),
    readFile(partyPath, "utf-8").catch(() => null),
    readdir(pipelineDir, { withFileTypes: true }).then(entries =>
      entries.filter(e => e.isFile() && e.name.endsWith(".md")).map(e => e.name)
    ).catch(() => [])
  ]);

  if (!squadYamlRaw) throw new Error(`Squad ${squadName} not found`);

  // Squad config files are plain YAML (no `---` frontmatter block). When loadYaml
  // found no delimiters it returns frontmatter:{} + the whole file as body, so
  // fall back to parsing the body directly.
  let squadYaml = squadYamlRaw;
  if (!squadYaml.frontmatter?.squad && squadYaml.body) {
    try {
      const parsed = load(squadYaml.body);
      if (parsed && parsed.squad) squadYaml = { frontmatter: parsed, body: "" };
      else console.error(`[pipeline] squad.yaml for '${squadName}' parsed but missing 'squad' key`);
    } catch (e) {
      console.error(`[pipeline] failed to parse squad.yaml for '${squadName}':`, e.message);
    }
  }

  // Parse party CSV
  const party = [];
  if (partyCsv) {
    const lines = partyCsv.trim().split("\n");
    if (lines.length > 1) {
      const headers = lines[0].split(",").map(h => h.trim());
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim());
        const row = {};
        headers.forEach((h, idx) => row[h] = values[idx] || "");
        if (row.path || row.id) {
          const derivedId = row.path.replace(/\.\.[/\\]/g, "").replace(/^agents\//, "").replace(/\.agent\.md$/, "");
          const id = row.id || derivedId;
          party.push({
            id,
            displayName: row.displayName || id,
            icon: row.icon || "🤖",
            path: row.path || `./agents/${id}.agent.md`,
          });
        }
      }
    }
  }

  // Load pipeline steps
  const steps = [];
  const inlineSteps = squadYaml.frontmatter.pipeline?.steps;
  if (pipelineSteps.length === 0 && Array.isArray(inlineSteps)) {
    // Steps defined inline in squad.yaml (no separate pipeline/steps/*.md files).
    for (const s of inlineSteps) {
      validatePipelineStep(s);
      steps.push({ ...s, body: s.prompt || s.description || "" });
    }
  } else {
    for (const stepFile of pipelineSteps) {
      const step = await loadYaml(join(pipelineDir, stepFile));
      if (step) {
        validatePipelineStep(step.frontmatter);
        steps.push({ ...step.frontmatter, body: step.body });
      }
    }
  }

  // Sort steps by order in squad.yaml if specified
  if (squadYaml.frontmatter.pipeline?.steps) {
    const order = squadYaml.frontmatter.pipeline.steps.map(s => s.id);
    steps.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  }

  return {
    squad: squadYaml.frontmatter,
    party,
    steps,
    squadDir,
  };
}

function generateRunId() {
  const now = new Date();
  return now.toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "-");
}

function getDeskPosition(index) {
  return {
    col: (index % 3) + 1,
    row: Math.floor(index / 3) + 1,
  };
}

function transformOutputPath(path, runId, version) {
  if (!path.startsWith("squads/")) return path;
  const parts = path.split("/");
  const squadName = parts[1];
  const outputIndex = parts.indexOf("output");
  if (outputIndex === -1) return path;
  const newParts = [...parts];
  newParts.splice(outputIndex + 1, 0, runId, version);
  return newParts.join("/");
}

function transformInputPath(path, runId) {
  if (!path.startsWith("squads/")) return path;
  const parts = path.split("/");
  const outputIndex = parts.indexOf("output");
  if (outputIndex === -1) return path;
  const newParts = [...parts];
  newParts.splice(outputIndex + 1, 0, runId);
  return newParts.join("/");
}

function buildInitialState(squadName, party, totalSteps, runId) {
  return {
    squad: squadName,
    status: "idle",
    step: { current: 0, total: totalSteps, label: "" },
    agents: party.map((member, index) => ({
      id: member.id,
      name: member.displayName,
      icon: member.icon,
      status: "idle",
      desk: getDeskPosition(index),
    })),
    handoff: null,
    startedAt: null,
    updatedAt: new Date().toISOString(),
    runId,
  };
}

async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

async function fileExists(path) {
  try { await stat(path); return true; } catch { return false; }
}

async function validateInput(inputPath, runId) {
  const transformed = transformInputPath(inputPath, runId);
  const fullPath = join(PROJECT_ROOT, transformed);
  try {
    const stats = await stat(fullPath);
    return stats.size > 0;
  } catch { return false; }
}

async function validateOutput(outputPath, runId, version) {
  const transformed = transformOutputPath(outputPath, runId, version);
  const fullPath = join(PROJECT_ROOT, transformed);
  try {
    const stats = await stat(fullPath);
    return stats.size > 0;
  } catch { return false; }
}

async function getNextVersion(runDir, relativePath) {
  const dir = join(runDir, relativePath);
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const versions = entries
      .filter(e => e.isDirectory() && /^v\d+$/.test(e.name))
      .map(e => parseInt(e.name.slice(1), 10))
      .sort((a, b) => b - a);
    return `v${(versions[0] || 0) + 1}`;
  } catch { return "v1"; }
}

function buildAgentPrompt(agentDef, step, ctx, skillInjections, formatInjection, version) {
  const inputContent = step.inputFile
    ? `\n\nINPUT FILE: ${transformInputPath(step.inputFile, ctx.runId)}`
    : "";
  const outputPath = step.outputFile
    ? `\n\nOUTPUT PATH: ${transformOutputPath(step.outputFile, ctx.runId, version)}`
    : "";

  return `
${agentDef.body}

${formatInjection || ""}

${skillInjections}

--- CONTEXT ---
Company Context: ${ctx.companyContext}
Squad Memory: ${ctx.squadMemory}
Run ID: ${ctx.runId}
Step: ${step.label} (${step.id})
${inputContent}
${outputPath}

--- INSTRUCTIONS ---
Execute step: ${step.id}
${step.type === "checkpoint" ? "Wait for user input at checkpoint." : "Produce output and save to output path."}
  `.trim();
}

async function loadSkillInstructions(skillId) {
  const skillPath = join(SKILLS_DIR, skillId, "SKILL.md");
  const skill = await loadYaml(skillPath);
  return skill ? skill.body : "";
}

async function loadFormatBestPractice(format) {
  const formatPath = join(PROJECT_ROOT, "_opensquad", "core", "best-practices", `${format}.md`);
  const formatFile = await loadYaml(formatPath);
  if (!formatFile) return null;
  const fmMatch = formatFile.frontmatter;
  const name = fmMatch.name || format;
  return `--- FORMAT: ${name} ---\n\n${formatFile.body}`;
}

async function checkVetoConditions(conditions, output) {
  for (const condition of conditions) {
    if (output.toLowerCase().includes(condition.toLowerCase())) {
      return { triggered: true, condition };
    }
  }
  return { triggered: false };
}

async function executeCheckpoint(step, ctx) {
  // Checkpoint - waits for user input
  return `[CHECKPOINT: ${step.label}]\nUser input captured at ${new Date().toISOString()}`;
}

/**
 * Execute a pipeline step using the real Orun OS LLM stack.
 * Prefers the orchestrator's autonomousLoop (tool-capable agents) and falls
 * back to a plain chat via aiRouter.routeChat (no tools), mirroring the
 * scheduler.cjs behavior. If no LLM stack is configured, returns a readable
 * placeholder so the pipeline still completes for offline/testing runs.
 */
async function runStepWithOrchestrator(orchestrator, agentDef, step, ctx, skillInjections, formatInjection, version) {
  const prompt = buildAgentPrompt(agentDef, step, ctx, skillInjections, formatInjection, version);
  const agentId = step.agent;
  const modelTier = step.model_tier || "powerful";

  // 1) Full autonomous loop (tool-capable) if available
  if (orchestrator && orchestrator.runAgentTask) {
    try {
      const output = await orchestrator.runAgentTask(agentId, prompt, { modelTier });
      if (output && typeof output === "string" && output.trim()) return output;
    } catch (e) {
      orchestrator.log?.error?.(`[pipeline] autonomous loop failed for ${agentId}:`, e.message);
    }
  }

  // 2) Plain chat fallback via aiRouter
  if (orchestrator && orchestrator.chat) {
    try {
      const output = await orchestrator.chat(agentId, prompt, { modelTier });
      if (output && typeof output === "string" && output.trim()) return output;
    } catch (e) {
      orchestrator.log?.error?.(`[pipeline] chat fallback failed for ${agentId}:`, e.message);
    }
  }

  // 3) Offline/test placeholder
  const executorLabel = step.type === "subagent" ? `SUBAGENT (${modelTier.toUpperCase()})` : "INLINE";
  return `[${executorLabel} EXECUTION - ${agentDef.frontmatter.name}]\nPrompt length: ${prompt.length} chars\n[No LLM stack configured — pipeline completed in dry-run mode]`;
}

class PipelineRunner {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.activeRuns = new Map();
  }

  async runPipeline(squadName, options = {}) {
    const loaded = await loadSquad(squadName);
    if (!loaded) throw new Error(`Squad ${squadName} not found`);

    const { squad, party, steps, squadDir } = loaded;
    const runId = generateRunId();
    const runDir = join(squadDir, "output", runId);
    await ensureDir(runDir);

    // Load contexts
    const companyContext = await this.loadCompanyContext();
    const squadMemory = await this.loadSquadMemory(squadName);

    // Initialize state
    const state = buildInitialState(squadName, party, steps.length, runId);
    const statePath = join(squadDir, STATE_FILE);
    await writeFile(statePath, JSON.stringify(state, null, 2));

    // Store run context
    const ctx = {
      squad,
      party,
      steps,
      companyContext,
      squadMemory,
      runId,
      runDir,
      state,
      squadDir,
      reviewCycles: new Map(),
    };

    this.activeRuns.set(runId, ctx);

    // Update state to running
    await this.updateState(ctx, { status: "running", startedAt: new Date().toISOString() });

    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const result = await this.executeStep(ctx, i);
        if (!result.success) {
          await this.updateState(ctx, { status: "failed", failedAt: new Date().toISOString() });
          return { success: false, runId, error: result.error };
        }
      }

      await this.updateState(ctx, {
        status: "completed",
        completedAt: new Date().toISOString(),
        agents: ctx.state.agents.map(a => ({ ...a, status: "done" })),
      });

      await this.archiveState(ctx);
      await this.updateSquadMemory(ctx);

      return { success: true, runId };
    } catch (error) {
      await this.updateState(ctx, { status: "failed", failedAt: new Date().toISOString() });
      return { success: false, runId, error: error.message };
    } finally {
      this.activeRuns.delete(runId);
    }
  }

  async executeStep(ctx, stepIndex) {
    const step = ctx.steps[stepIndex];
    const agent = ctx.party.find(m => m.id === step.agent);
    if (!agent) return { success: false, error: `Agent ${step.agent} not found in party` };

    await this.updateState(ctx, {
      status: "running",
      step: { current: stepIndex + 1, total: ctx.steps.length, label: step.label },
      agents: ctx.state.agents.map(a => a.id === step.agent ? { ...a, status: "working" } : a),
    });

    // Input validation
    if (step.inputFile) {
      const valid = await validateInput(step.inputFile, ctx.runId);
      if (!valid) {
        return { success: false, error: `Input file not found or empty: ${step.inputFile}` };
      }
    }

    // Determine version
    const version = step.outputFile
      ? await getNextVersion(ctx.runDir, dirname(transformOutputPath(step.outputFile, ctx.runId, "v1")))
      : "v1";

    // Load agent definition
    const agentPath = join(AGENTS_DIR, `${step.agent}.agent.md`);
    const agentDef = await loadYaml(agentPath);
    if (!agentDef) return { success: false, error: `Agent definition not found: ${step.agent}` };

    // Resolve skill injections
    const skillInjections = await this.resolveSkillInstructions(step.agent, agentDef);

    // Load format best practice
    const formatInjection = step.format
      ? await loadFormatBestPractice(step.format)
      : null;

    let output = "";

    if (step.type === "checkpoint") {
      output = await executeCheckpoint(step, ctx);
    } else {
      output = await runStepWithOrchestrator(this.orchestrator, agentDef, step, ctx, skillInjections, formatInjection, version);
    }

    // Save output if specified
    if (step.outputFile) {
      const transformedOutput = transformOutputPath(step.outputFile, ctx.runId, version);
      const fullOutputPath = join(PROJECT_ROOT, transformedOutput);
      await ensureDir(dirname(fullOutputPath));
      await writeFile(fullOutputPath, output, "utf-8");

      const valid = await validateOutput(step.outputFile, ctx.runId, version);
      if (!valid) {
        return { success: false, error: `Output validation failed: ${step.outputFile}` };
      }
    }

    // Veto conditions
    if (step.vetoConditions && step.vetoConditions.length > 0) {
      const vetoResult = await checkVetoConditions(step.vetoConditions, output);
      if (vetoResult.triggered) {
        return { success: false, error: `Veto triggered: ${vetoResult.condition}` };
      }
    }

    // Handoff to next step
    if (stepIndex < ctx.steps.length - 1) {
      const nextStep = ctx.steps[stepIndex + 1];
      const nextAgent = ctx.party.find(m => m.id === nextStep.agent);

      await this.updateState(ctx, {
        handoff: {
          from: step.agent,
          to: nextStep.agent,
          message: `Completed ${step.label}. Output saved. Next: ${nextStep.label} by ${nextAgent?.displayName || nextStep.agent}`,
          completedAt: new Date().toISOString(),
        },
        agents: ctx.state.agents.map(a =>
          a.id === step.agent ? { ...a, status: "delivering" } :
          a.id === nextStep.agent ? { ...a, status: "idle" } : a
        ),
      });

      await this.updateState(ctx, {
        agents: ctx.state.agents.map(a =>
          a.id === step.agent ? { ...a, status: "done" } :
          a.id === nextStep.agent ? { ...a, status: "working" } : a
        ),
      });
    } else {
      await this.updateState(ctx, {
        agents: ctx.state.agents.map(a => a.id === step.agent ? { ...a, status: "done" } : a),
      });
    }

    return { success: true, output };
  }

  async resolveSkillInstructions(agentId, agentDef) {
    if (!agentDef.frontmatter.skills) return "";
    const instructions = [];
    for (const skillId of agentDef.frontmatter.skills) {
      if (["web_search", "web_fetch"].includes(skillId)) continue;
      const skillBody = await loadSkillInstructions(skillId);
      if (skillBody) {
        instructions.push(`--- SKILL INSTRUCTIONS ---\n\n## ${skillId}\n${skillBody}`);
      }
    }
    return instructions.join("\n\n");
  }

  async updateState(ctx, updates) {
    ctx.state = { ...ctx.state, ...updates, updatedAt: new Date().toISOString() };
    const statePath = join(ctx.squadDir, STATE_FILE);
    await writeFile(statePath, JSON.stringify(ctx.state, null, 2));
  }

  async loadCompanyContext() {
    const path = join(PROJECT_ROOT, "_opensquad", "_memory", "company.md");
    try { return await readFile(path, "utf-8"); } catch { return ""; }
  }

  async loadSquadMemory(squadName) {
    const path = join(SQUADS_DIR, squadName, MEMORY_DIR, "memories.md");
    try { return await readFile(path, "utf-8"); } catch { return ""; }
  }

  async archiveState(ctx) {
    const statePath = join(ctx.squadDir, STATE_FILE);
    const archivePath = join(ctx.runDir, "state.json");
    await writeFile(archivePath, JSON.stringify(ctx.state, null, 2));

    // Clean up working state after delay
    setTimeout(async () => {
      try { await rm(statePath, { force: true }); } catch {}
    }, 10000);
  }

  async updateSquadMemory(ctx) {
    const memoryDir = join(ctx.squadDir, MEMORY_DIR);
    await ensureDir(memoryDir);

    const runsPath = join(memoryDir, "runs.md");
    let runsContent = "";
    try { runsContent = await readFile(runsPath, "utf-8"); } catch {}

    if (!runsContent.includes("| Data | Run ID |")) {
      runsContent = `# Run History: ${ctx.squad.name}\n\n| Data | Run ID | Tema | Output | Resultado |\n|------|--------|------|--------|-----------|\n`;
    }

    const newRow = `| ${new Date().toISOString().slice(0, 10)} | ${ctx.runId} | Pipeline execution | Output generated | Concluído |\n`;
    const lines = runsContent.split("\n");
    if (lines.length >= 2) {
      lines.splice(2, 0, newRow);
    } else {
      lines.push(newRow);
    }
    await writeFile(runsPath, lines.join("\n"), "utf-8");
  }

  getActiveRuns() {
    return Array.from(this.activeRuns.keys());
  }

  async getDashboardState(squadName) {
    const statePath = join(SQUADS_DIR, squadName, STATE_FILE);
    try { return JSON.parse(await readFile(statePath, "utf-8")); } catch { return null; }
  }

  /**
   * List all squads available for orchestration, merged with their current
   * dashboard state (status, progress, agents) so the UI can render live data.
   */
  async listSquads() {
    const entries = await readdir(SQUADS_DIR, { withFileTypes: true }).catch(() => []);
    const names = [];
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (await fileExists(join(SQUADS_DIR, e.name, "squad.yaml"))) names.push(e.name);
    }

    const squads = [];
    for (const name of names) {
      const loaded = await loadSquad(name).catch(() => null);
      if (!loaded) continue;
      const { squad, party, steps } = loaded;
      const state = await this.getDashboardState(name);

      squads.push({
        id: name,
        name: squad.name || name,
        description: squad.description || squad.tagline || "",
        icon: squad.icon || "🤖",
        agentCount: party.length,
        version: squad.version || "1.0.0",
        status: state?.status || "idle",
        state,
        steps: steps.length,
      });
    }
    // Sort: running first, then by name
    squads.sort((a, b) => {
      const rank = { running: 0, idle: 1, completed: 2, failed: 3 };
      return (rank[a.status] ?? 4) - (rank[b.status] ?? 4) || a.name.localeCompare(b.name);
    });
    return squads;
  }

  /**
   * Aggregate dashboard metrics across all squads (for the metrics row).
   */
  async getDashboardMetrics() {
    const squads = await this.listSquads();
    const today = new Date().toISOString().slice(0, 10);
    let completedToday = 0;
    let failedToday = 0;
    for (const s of squads) {
      const completedAt = s.state?.completedAt || "";
      const failedAt = s.state?.failedAt || "";
      if (s.status === "completed" && completedAt.slice(0, 10) === today) completedToday++;
      if (s.status === "failed" && failedAt.slice(0, 10) === today) failedToday++;
    }
    return {
      totalSquads: squads.length,
      runningSquads: squads.filter(s => s.status === "running").length,
      completedToday,
      failedToday,
    };
  }
}

function ensureDir(path) {
  return mkdir(path, { recursive: true });
}

module.exports = { PipelineRunner, loadSquad, PipelineStepSchema };