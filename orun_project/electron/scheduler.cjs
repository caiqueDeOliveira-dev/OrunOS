// electron/scheduler.cjs
//
// Runs scheduled per-agent tasks — right now just "generate something and
// deliver it" jobs like the Personal Trainer's daily workout. Reads its
// schedule from settings so it can be reconfigured without restarting.

const cron = require("node-cron");

let scheduledJobs = new Map(); // agentName -> cron task
let deps = null; // { db, aiRouter, getSecret, deliver, log, agentPrompts }

function init(dependencies) {
  deps = dependencies;
  reloadAll();
}

function reloadAll() {
  for (const task of scheduledJobs.values()) task.stop();
  scheduledJobs.clear();

  const schedules = deps.db.getSetting("schedules", {});
  for (const [agentName, cfg] of Object.entries(schedules)) {
    if (cfg?.enabled && cfg.time) scheduleAgent(agentName, cfg.time);
  }
}

function scheduleAgent(agentName, time) {
  const [hour, minute] = (time || "07:00").split(":").map(Number);
  const cronExpr = `${minute || 0} ${hour || 7} * * *`;
  const task = cron.schedule(cronExpr, () => runAgentTask(agentName).catch((err) => deps.log.error(`[scheduler] ${agentName} failed:`, err.message)));
  scheduledJobs.set(agentName, task);
  deps.log.info(`[scheduler] ${agentName} scheduled daily at ${time}`);
}

async function runAgentTask(agentName) {
  const { db, aiRouter, agentPrompts, processAgentReply } = deps;
  const globalAI = { ...{ provider: "ollama", model: "llama3.1" }, ...db.getSetting("ai", {}) };
  const override = db.getSetting("agentModels", {})[agentName];
  const provider = override?.provider || globalAI.provider;
  const model = override?.model || globalAI.model;
  const apiKey = deps.getSecret(provider);
  const systemPrompt = agentPrompts.promptFor(agentName, override?.systemPrompt);

  const userPrompts = {
    "Personal Trainer": "Generate today's workout.",
    Finance: "Analyze today's spending habits and provide a brief financial tip.",
    Health: "Check in on today's health metrics and provide a wellness reminder.",
    Developer: "Review a common coding pattern and suggest improvements.",
    Teacher: "Suggest a micro-learning topic for today.",
    Nutritionist: "Suggest a healthy meal idea for today.",
  };
  const userPrompt = userPrompts[agentName] || "Generate today's update.";
  const result = await aiRouter.routeChat({
    provider, model, baseUrl: globalAI.baseUrl, apiKey,
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
  });

  const finalText = processAgentReply ? processAgentReply(agentName, result.text) : result.text;

  // Log into that agent's default conversation so it's visible in-app too.
  const conversations = db.listConversations(agentName);
  let convo = conversations[0];
  if (!convo) convo = db.createConversation(`${agentName}-${Date.now()}`, `${agentName} — daily`, agentName);
  db.addMessage(convo.id, { id: `${Date.now()}`, role: "assistant", content: finalText });

  await deps.deliver(agentName, finalText);
  return finalText;
}

function setSchedule(agentName, cfg) {
  const schedules = deps.db.getSetting("schedules", {});
  schedules[agentName] = cfg;
  deps.db.setSetting("schedules", schedules);
  reloadAll();
}

function getSchedules() {
  return deps.db.getSetting("schedules", {});
}

module.exports = { init, setSchedule, getSchedules, runAgentTask };
