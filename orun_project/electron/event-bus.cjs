// electron/event-bus.cjs
//
// Event Bus — pub/sub motor para comunicação entre agentes e módulos.
//
// Inspirado no padrão Buzz (pub/sub com tópicos, history, wildcard).
// Engine puro e testável: todos os deps são injetáveis.
//
// Tópicos seguem o padrão "agente:evento" (ex.: "health:scan-completed",
// "memory:saved", "shield:threat-detected"). Wildcards: "health:*" escuta
// todos os eventos de health, "*:*" escuta tudo.

const crypto = require("crypto");

function createEventBus(opts = {}) {
  const {
    maxHistory = 200,
    logger = null,
    now = () => Date.now(),
  } = opts;

  // Map<topicPattern, Set<{id, handler, once}>>
  const listeners = new Map();
  // Array de eventos emitidos (history circular)
  const history = [];
  let emitCount = 0;

  /** Gera ID único de subscription. */
  function makeSubId() {
    return `sub_${crypto.randomUUID().slice(0, 8)}`;
  }

  /** Compara um tópico com um padrão (suporta * e **). */
  function topicMatches(topic, pattern) {
    if (pattern === "*:*" || pattern === "*") return true;
    if (!pattern.includes("*")) return topic === pattern;

    const patternParts = pattern.split(":");
    const topicParts = topic.split(":");

    // Wildcard ** in last position matches any remaining parts
    const lastIsDouble = patternParts[patternParts.length - 1] === "**";
    if (lastIsDouble) {
      if (topicParts.length < patternParts.length - 1) return false;
      for (let i = 0; i < patternParts.length - 1; i++) {
        if (patternParts[i] === "*") continue;
        if (patternParts[i] !== topicParts[i]) return false;
      }
      return true;
    }

    // Normal single * matching: lengths must match
    if (patternParts.length !== topicParts.length) return false;
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === "*") continue;
      if (patternParts[i] !== topicParts[i]) return false;
    }
    return true;
  }

  /**
   * Publica um evento.
   * @param {string} topic - Tópico no formato "agente:evento"
   * @param {object} data - Dados do evento
   * @param {object} meta - Metadados opcionais (source, priority, etc.)
   * @returns {{ ok: boolean, delivered: number, topic: string }}
   */
  function emit(topic, data = {}, meta = {}) {
    if (typeof topic !== "string" || !topic.trim()) {
      return { ok: false, delivered: 0, topic: topic || "" };
    }

    const event = {
      id: `evt_${crypto.randomUUID().slice(0, 8)}`,
      topic: topic.trim(),
      data,
      meta: {
        timestamp: now(),
        source: meta.source || "unknown",
        priority: meta.priority || "normal",
        ...meta,
      },
    };

    // Salva no history
    history.push(event);
    if (history.length > maxHistory) {
      history.shift();
    }
    emitCount++;

    // Entrega para listeners que casam
    let delivered = 0;
    for (const [pattern, subs] of listeners) {
      if (!topicMatches(topic, pattern)) continue;
      for (const sub of subs) {
        try {
          sub.handler(event);
          delivered++;
        } catch (err) {
          if (logger) logger.error(`[event-bus] handler error: ${sub.id} on ${topic}:`, err);
        }
        if (sub.once) {
          subs.delete(sub);
        }
      }
    }

    if (logger) logger.info(`[event-bus] emit ${topic} → ${delivered} delivered`);
    return { ok: true, delivered, topic };
  }

  /**
   * Inscreve em um ou mais tópicos.
   * @param {string|string[]} topics - Tópico(s) ou padrão(s) wildcard
   * @param {function} handler - Callback(event)
   * @param {object} opts - { once: false, priority: 0 }
   * @returns {{ unsubscribe: function, id: string }}
   */
  function subscribe(topics, handler, subOpts = {}) {
    if (typeof handler !== "function") {
      return { unsubscribe: () => {}, id: "" };
    }

    const topicList = Array.isArray(topics) ? topics : [topics];
    const { once = false } = subOpts;
    const id = makeSubId();
    const subs = [];

    for (const topic of topicList) {
      if (typeof topic !== "string") continue;
      const pattern = topic.trim();
      if (!listeners.has(pattern)) {
        listeners.set(pattern, new Set());
      }
      const entry = { id, handler, once };
      listeners.get(pattern).add(entry);
      subs.push({ pattern, entry });
    }

    return {
      id,
      unsubscribe() {
        for (const { pattern, entry } of subs) {
          const set = listeners.get(pattern);
          if (set) {
            set.delete(entry);
            if (set.size === 0) listeners.delete(pattern);
          }
        }
      },
    };
  }

  /**
   * Inscreve uma vez (auto-unsubscribe após primeiro evento).
   */
  function once(topic, handler, opts = {}) {
    return subscribe(topic, handler, { ...opts, once: true });
  }

  /**
   * Remove todas as inscrições de um subscriber por ID.
   */
  function unsubscribeById(id) {
    for (const [pattern, subs] of listeners) {
      for (const sub of subs) {
        if (sub.id === id) {
          subs.delete(sub);
        }
      }
      if (subs.size === 0) listeners.delete(pattern);
    }
  }

  /**
   * Retorna o histórico de eventos.
   * @param {object} filter - { topic, source, since, limit }
   */
  function getHistory(filter = {}) {
    let result = [...history];

    if (filter.topic) {
      result = result.filter((e) => topicMatches(e.topic, filter.topic));
    }
    if (filter.source) {
      result = result.filter((e) => e.meta.source === filter.source);
    }
    if (filter.since) {
      const sinceTs = typeof filter.since === "number" ? filter.since : new Date(filter.since).getTime();
      result = result.filter((e) => e.meta.timestamp >= sinceTs);
    }
    if (filter.limit) {
      result = result.slice(-filter.limit);
    }

    return result;
  }

  /**
   * Retorna stats do bus.
   */
  function stats() {
    let totalListeners = 0;
    for (const subs of listeners.values()) {
      totalListeners += subs.size;
    }
    return {
      totalEmitted: emitCount,
      totalListeners,
      historySize: history.length,
      patterns: listeners.size,
    };
  }

  /**
   * Limpa todo o estado (listeners + history).
   */
  function reset() {
    listeners.clear();
    history.length = 0;
    emitCount = 0;
  }

  /**
   * Remove listeners de um padrão específico.
   */
  function unsubscribePattern(pattern) {
    listeners.delete(pattern);
  }

  return {
    emit,
    subscribe,
    once,
    unsubscribeById,
    unsubscribePattern,
    getHistory,
    stats,
    reset,
    // Exposto para debug/teste
    _topicMatches: topicMatches,
    _listenerCount: () => {
      let n = 0;
      for (const s of listeners.values()) n += s.size;
      return n;
    },
  };
}

module.exports = { createEventBus };
