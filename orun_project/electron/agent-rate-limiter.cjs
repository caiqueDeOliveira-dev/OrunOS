const log = require("electron-log");

const DEFAULT_MAX_CALLS_PER_MINUTE = 20;
const DEFAULT_MAX_TOOLS_PER_MINUTE = 10;

const stores = new Map();

function getStore(agentId) {
  let store = stores.get(agentId);
  if (!store) {
    store = { timestamps: [], toolTimestamps: [] };
    stores.set(agentId, store);
  }
  return store;
}

function pruneOld(entries, windowMs) {
  const cutoff = Date.now() - windowMs;
  let i = 0;
  while (i < entries.length && entries[i] < cutoff) i++;
  if (i > 0) entries.splice(0, i);
}

function checkRate(entries, windowMs, maxAllowed, label) {
  pruneOld(entries, windowMs);
  if (entries.length >= maxAllowed) {
    const oldest = entries[0];
    const retryAfter = Math.ceil((oldest + windowMs - Date.now()) / 1000);
    return {
      allowed: false,
      reason: `${label} rate limit exceeded (${entries.length}/${maxAllowed} per ${windowMs / 1000}s). Retry in ${retryAfter}s.`,
    };
  }
  return { allowed: true };
}

function checkAgentRate(agentId) {
  const store = getStore(agentId);
  return checkRate(store.timestamps, 60000, DEFAULT_MAX_CALLS_PER_MINUTE, "API call");
}

function checkToolRate(agentId) {
  const store = getStore(agentId);
  return checkRate(store.toolTimestamps, 60000, DEFAULT_MAX_TOOLS_PER_MINUTE, "Tool execution");
}

function recordCall(agentId) {
  const store = getStore(agentId);
  pruneOld(store.timestamps, 60000);
  store.timestamps.push(Date.now());
}

function recordToolCall(agentId) {
  const store = getStore(agentId);
  pruneOld(store.toolTimestamps, 60000);
  store.toolTimestamps.push(Date.now());
}

function getAgentStats(agentId) {
  const store = getStore(agentId);
  pruneOld(store.timestamps, 60000);
  pruneOld(store.toolTimestamps, 60000);
  return {
    callsInLastMinute: store.timestamps.length,
    toolsInLastMinute: store.toolTimestamps.length,
  };
}

function resetAgent(agentId) {
  stores.delete(agentId);
}

function cleanup() {
  for (const [id, store] of stores) {
    pruneOld(store.timestamps, 60000);
    pruneOld(store.toolTimestamps, 60000);
    if (store.timestamps.length === 0 && store.toolTimestamps.length === 0) {
      stores.delete(id);
    }
  }
  if (stores.size > 500) {
    const sorted = [...stores.entries()].sort((a, b) => {
      const aTime = a[1].timestamps[0] || a[1].toolTimestamps[0] || 0;
      const bTime = b[1].timestamps[0] || b[1].toolTimestamps[0] || 0;
      return aTime - bTime;
    });
    for (let i = 0; i < sorted.length - 200; i++) {
      stores.delete(sorted[i][0]);
    }
  }
}

module.exports = {
  checkAgentRate,
  checkToolRate,
  recordCall,
  recordToolCall,
  getAgentStats,
  resetAgent,
  cleanup,
};
