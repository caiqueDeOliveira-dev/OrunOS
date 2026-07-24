// electron/agent-processor.cjs
//
// Agent post-processing for Orun OS.
// Extracts structured data from AI replies, records to DB, formats summaries.

const { randomUUID } = require("crypto");
const log = require("electron-log");

let db = null;
let agentPrompts = null;
let n8n = null;
let syncEnqueue = null;

function init(deps) {
  db = deps.db;
  agentPrompts = deps.agentPrompts;
  n8n = deps.n8n;
  syncEnqueue = deps.syncEnqueue;
}

const AGENT_PROCESSORS = {
  "Health": { extract: (t) => agentPrompts.extractHealthJSON(t) || agentPrompts.extractNutritionJSON(t), syncTable: "health_log" },
  "Finance": { extract: (t) => agentPrompts.extractFinanceJSON(t), syncTable: "finance_log" },
  "Developer": { extract: (t) => agentPrompts.extractDeveloperJSON(t), syncTable: "developer_reviews" },
  "Teacher": { extract: (t) => agentPrompts.extractTeacherJSON(t), syncTable: "teacher_progress" },
  "Creator": { extract: (t) => agentPrompts.extractVideoEditorJSON(t) || agentPrompts.extractMusicProducerJSON(t), syncTable: "video_projects" },
  "Designer": { extract: (t) => agentPrompts.extractImage3DJSON(t), syncTable: "image3d_generations" },
  "Marketing": { extract: (t) => agentPrompts.extractMarketingJSON(t) || agentPrompts.extractSocialMediaJSON(t), syncTable: "marketing_log" },
};

const AGENT_DB_RECORDERS = {
  "Health": (db, id, p) => {
    if (p.calories != null) db.recordMeal({ id, description: (p._text || "").slice(0, 200), calories: p.calories, protein_g: p.protein_g, carbs_g: p.carbs_g, fat_g: p.fat_g, source: "app" });
    else if (p.metric) db.recordHealthMetric({ id, metric: p.metric, value: p.value, unit: p.unit, notes: p.notes, source: "app" });
  },
  "Finance": (db, id, p) => db.recordExpense({ id, ...p, source: "app" }),
  "Developer": (db, id, p) => db.recordReview({ id, ...p, source: "app" }),
  "Teacher": (db, id, p) => db.recordProgress({ id, ...p, source: "app" }),
  "Creator": (db, id, p) => {
    if (p.template != null) db.recordVideoProject({ id, ...p, source: "app" });
    else if (p.engine) db.recordMusicProject({ id, ...p, source: "app" });
  },
  "Designer": (db, id, p) => db.recordImage3DGeneration({ id, ...p, source: "app" }),
  "Marketing": (db, id, p) => {
    if (p.campaign_name) db.recordMarketing({ id, ...p });
    else if (p.platform) db.recordMarketing({ id, ...p });
  },
};

const ACTION_TAG = /<<ACTION:([^>]+)>>([\s\S]*?)<<\/ACTION>>/;

function formatAgentSummary(agentId, parsed, text) {
  switch (agentId) {
    case "Health": {
      if (parsed.calories != null) { const { totals } = db.getDailyNutrition(); return `${text}\n\n📊 Hoje: ${Math.round(totals.calories)} kcal (${Math.round(totals.protein_g)}g proteina, ${Math.round(totals.carbs_g)}g carbs, ${Math.round(totals.fat_g)}g gordura).`; }
      if (parsed.metric) return `${text}\n\n❤️ Registrado: ${parsed.metric} = ${parsed.value}${parsed.unit ? " " + parsed.unit : ""}.`;
      return text;
    }
    case "Finance": { const { totals, balance } = db.getDailyFinance(); const e = parsed.type === "income" ? "💰" : "💸"; return `${text}\n\n${e} Hoje: +$${totals.income.toFixed(2)} / -$${totals.expenses.toFixed(2)} (saldo: $${balance.toFixed(2)}).`; }
    case "Developer": { const sev = { low: "🟢", medium: "🟡", high: "🟠", critical: "🔴" }[parsed.severity] || "⚪"; return `${text}\n\n🔍 Review: ${parsed.issues_found} problema(s) ${sev} ${parsed.severity}.`; }
    case "Teacher": { const st = { learning: "📖", reviewed: "✅", mastered: "🏆" }[parsed.status] || "📚"; return `${text}\n\n${st} Progresso: ${parsed.subject} → ${parsed.topic} (${parsed.status}${parsed.score != null ? ", nota: " + parsed.score : ""}).`; }
    case "Creator": {
      if (parsed.template != null) { const vs = { draft: "📝", rendering: "🎬", completed: "✅", failed: "❌" }[parsed.status] || "📹"; return `${text}\n\n${vs} Projeto: "${parsed.title}" (${parsed.template}, ${parsed.duration_sec}s).`; }
      if (parsed.engine) { const ms = { draft: "📝", processing: "🎵", completed: "✅", failed: "❌" }[parsed.status] || "🎶"; return `${text}\n\n${ms} Musica: "${parsed.title}" (${parsed.engine}, ${parsed.duration_sec}s).`; }
      return text;
    }
    case "Designer": return `${text}\n\n🎨 Geracao via ${parsed.engine}: "${parsed.prompt.slice(0, 80)}".`;
    case "Marketing": {
      if (parsed.campaign_name) return `${text}\n\n📢 Campanha: "${parsed.campaign_name}" (${parsed.channels.join(", ")}).`;
      if (parsed.platform) return `${text}\n\n📱 Conteudo: ${parsed.platform}/${parsed.format}.`;
      return text;
    }
    default: return text;
  }
}

function processAgentReply(agentId, text) {
  if (!agentId) return text;
  const proc = AGENT_PROCESSORS[agentId];
  if (!proc) return text;
  const parsed = proc.extract(text);
  if (!parsed) return text;
  parsed._text = text;
  const id = randomUUID();
  try { AGENT_DB_RECORDERS[agentId](db, id, parsed); } catch (e) { log.warn(`[agent-processing] record failed for ${agentId}:`, e.message); }
  try { syncEnqueue(proc.syncTable, { id, date: new Date().toISOString().slice(0, 10), ...parsed, source: "app", created_at: Date.now() }); } catch (e) { log.warn(`[agent-processing] sync failed for ${agentId}:`, e.message); }
  try { return formatAgentSummary(agentId, parsed, text); } catch (e) { return text; }
}

async function processActions(text) {
  const n8nCfg = db.getSetting("n8n", {});
  if (!n8nCfg.autoTrigger) return text;
  const match = text.match(ACTION_TAG);
  if (!match) return text;
  const [full, rawName, payloadRaw] = match;
  const cleaned = text.replace(full, "").trim();
  const actions = db.getSetting("automationActions", []);
  const action = actions.find((a) => a.name === rawName.trim());
  if (!action) return cleaned;
  let payload;
  try { payload = JSON.parse(payloadRaw); } catch { payload = { raw: payloadRaw }; }
  try {
    await n8n.triggerWebhook({ webhookUrl: action.webhookUrl, payload, headerName: action.headerName, headerValue: action.headerValue });
    log.info(`[automation] triggered "${action.name}"`);
    return `${cleaned}\n\n✓ Triggered automation "${action.name}".`;
  } catch (err) {
    log.warn(`[automation] "${action.name}" failed:`, err.message);
    return `${cleaned}\n\n⚠️ Tried to trigger "${action.name}" but it failed: ${err.message}`;
  }
}

function recordUsageSafely(provider, usage) {
  try { db.recordUsage(provider, usage?.tokensIn || 0, usage?.tokensOut || 0); } catch (err) { log.warn("recordUsage failed:", err.message); }
}

module.exports = { init, processAgentReply, processActions, recordUsageSafely };
