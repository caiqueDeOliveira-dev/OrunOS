// electron/__tests__/event-bus.test.cjs
// Testes do Event Bus (pub/sub, history, wildcard, integração com Agent Hub).

const { createEventBus } = require("../event-bus.cjs");
const { createAgentHub } = require("../agent-hub.cjs");

const REGISTRY = [
  { id: "Developer", name: "Developer", persona: "voce e o developer", tools: ["write_file"], memoryScope: "Developer", permissions: ["write_file"] },
];

describe("event-bus: pub/sub básico", () => {
  it("emite e entrega evento para subscriber", () => {
    const bus = createEventBus();
    const received = [];
    bus.subscribe("health:scan", (evt) => received.push(evt));

    const result = bus.emit("health:scan", { target: "/home" }, { source: "health" });
    expect(result.ok).toBe(true);
    expect(result.delivered).toBe(1);
    expect(received).toHaveLength(1);
    expect(received[0].topic).toBe("health:scan");
    expect(received[0].data.target).toBe("/home");
    expect(received[0].meta.source).toBe("health");
  });

  it("múltiplos subscribers recebem o mesmo evento", () => {
    const bus = createEventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.subscribe("memory:saved", a);
    bus.subscribe("memory:saved", b);

    bus.emit("memory:saved", { id: 1 });
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });

  it("unsubscribe remove o listener", () => {
    const bus = createEventBus();
    const fn = vi.fn();
    const { unsubscribe } = bus.subscribe("x:test", fn);
    bus.emit("x:test", {});
    expect(fn).toHaveBeenCalledOnce();

    unsubscribe();
    bus.emit("x:test", {});
    expect(fn).toHaveBeenCalledOnce();
  });

  it("unsubscribeById remove todos os listeners de um sub", () => {
    const bus = createEventBus();
    const fn = vi.fn();
    const sub = bus.subscribe(["a:1", "b:2"], fn);
    bus.emit("a:1", {});
    bus.emit("b:2", {});
    expect(fn).toHaveBeenCalledTimes(2);

    bus.unsubscribeById(sub.id);
    bus.emit("a:1", {});
    bus.emit("b:2", {});
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("event-bus: wildcard", () => {
  it("health:* escuta todos os eventos de health", () => {
    const bus = createEventBus();
    const received = [];
    bus.subscribe("health:*", (evt) => received.push(evt.topic));

    bus.emit("health:scan-started", {});
    bus.emit("health:scan-completed", {});
    bus.emit("memory:saved", {}); // não deve chegar

    expect(received).toEqual(["health:scan-started", "health:scan-completed"]);
  });

  it("hub:** escuta hub:delegate:started (3 partes)", () => {
    const bus = createEventBus();
    const received = [];
    bus.subscribe("hub:**", (evt) => received.push(evt.topic));

    bus.emit("hub:delegate:started", {});
    bus.emit("hub:delegate:completed", {});
    bus.emit("memory:saved", {});

    expect(received).toEqual(["hub:delegate:started", "hub:delegate:completed"]);
  });

  it("*:* escuta todos os eventos", () => {
    const bus = createEventBus();
    const received = [];
    bus.subscribe("*:*", (evt) => received.push(evt.topic));

    bus.emit("a:b", {});
    bus.emit("c:d", {});
    expect(received).toEqual(["a:b", "c:d"]);
  });

  it("tópicos com partes diferentes não casam", () => {
    const bus = createEventBus();
    const fn = vi.fn();
    bus.subscribe("a:*", fn);

    bus.emit("a:b", {});
    bus.emit("b:a", {});
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("event-bus: once", () => {
  it("executa callback uma vez e auto-removed", () => {
    const bus = createEventBus();
    const fn = vi.fn();
    bus.once("x:once", fn);

    bus.emit("x:once", {});
    bus.emit("x:once", {});
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe("event-bus: history", () => {
  it("salva eventos emitidos", () => {
    const bus = createEventBus({ maxHistory: 5 });
    for (let i = 0; i < 3; i++) bus.emit("h:test", { i });
    expect(bus.getHistory()).toHaveLength(3);
  });

  it("filtra por tópico com wildcard", () => {
    const bus = createEventBus();
    bus.emit("a:1", {});
    bus.emit("b:2", {});
    bus.emit("a:3", {});

    const aEvents = bus.getHistory({ topic: "a:*" });
    expect(aEvents).toHaveLength(2);
  });

  it("filtra por source", () => {
    const bus = createEventBus();
    bus.emit("x:1", {}, { source: "alpha" });
    bus.emit("x:2", {}, { source: "beta" });

    expect(bus.getHistory({ source: "alpha" })).toHaveLength(1);
  });

  it("limita resultados", () => {
    const bus = createEventBus();
    for (let i = 0; i < 10; i++) bus.emit("x:t", {});
    expect(bus.getHistory({ limit: 3 })).toHaveLength(3);
  });

  it("respeita maxHistory (FIFO)", () => {
    const bus = createEventBus({ maxHistory: 3 });
    for (let i = 0; i < 5; i++) bus.emit("x:t", { i });
    const hist = bus.getHistory();
    expect(hist).toHaveLength(3);
    expect(hist[0].data.i).toBe(2); // primeiro mantido
  });
});

describe("event-bus: stats e reset", () => {
  it("stats retorna contadores corretos", () => {
    const bus = createEventBus();
    bus.emit("a:b", {});
    bus.emit("c:d", {});
    bus.subscribe("a:*", () => {});

    const s = bus.stats();
    expect(s.totalEmitted).toBe(2);
    expect(s.totalListeners).toBe(1);
    expect(s.historySize).toBe(2);
  });

  it("reset limpa tudo", () => {
    const bus = createEventBus();
    bus.subscribe("x:y", () => {});
    bus.emit("x:y", {});
    bus.reset();
    expect(bus.stats()).toEqual({ totalEmitted: 0, totalListeners: 0, historySize: 0, patterns: 0 });
  });
});

describe("event-bus: handler error não derruba o bus", () => {
  it("continua entregando para outros subscribers quando um falha", () => {
    const bus = createEventBus();
    const errorFn = vi.fn(() => { throw new Error("boom"); });
    const okFn = vi.fn();

    bus.subscribe("test:error", errorFn);
    bus.subscribe("test:error", okFn);

    bus.emit("test:error", {});
    expect(errorFn).toThrow();
    expect(okFn).toHaveBeenCalledOnce();
  });
});

describe("integração: agent-hub + event-bus", () => {
  it("emite delegate:started e delegate:completed durante delegação", async () => {
    const bus = createEventBus();
    const events = [];
    bus.subscribe("hub:**", (evt) => events.push(evt.topic));

    const hub = createAgentHub({
      registry: REGISTRY,
      route: async () => ({ agent: "Developer", reason: "r" }),
      execute: async () => ({ ok: true, result: "ok" }),
      eventBus: bus,
    });

    await hub.delegate({ request: "crie um componente" });
    expect(events).toContain("hub:delegate:started");
    expect(events).toContain("hub:delegate:completed");
  });

  it("emite delegate:escalated quando o especialista falha", async () => {
    const bus = createEventBus();
    const events = [];
    bus.subscribe("hub:**", (evt) => events.push(evt.topic));

    const hub = createAgentHub({
      registry: REGISTRY,
      route: async () => ({ agent: "Developer", reason: "r" }),
      execute: async () => ({ ok: false, error: "provider offline" }),
      escalate: async () => ({ ok: true, result: "central fixou" }),
      eventBus: bus,
    });

    await hub.delegate({ request: "x" });
    expect(events).toContain("hub:delegate:escalated");
  });

  it("funciona sem event-bus injetado (sem erro)", async () => {
    const hub = createAgentHub({
      registry: REGISTRY,
      route: async () => ({ agent: "Developer", reason: "r" }),
      execute: async () => ({ ok: true, result: "ok" }),
    });

    const res = await hub.delegate({ request: "x" });
    expect(res.ok).toBe(true);
  });
});
