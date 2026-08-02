const http = require("http");
const net = require("net");

describe("webhook-receiver.cjs", () => {
  let receiver;
  let port;
  const log = { info: () => {}, warn: () => {}, error: () => {} };

  function getFreePort() {
    return new Promise((resolve, reject) => {
      const srv = net.createServer();
      srv.listen(0, "127.0.0.1", () => {
        const p = srv.address().port;
        srv.close(() => resolve(p));
      });
      srv.on("error", reject);
    });
  }

  beforeAll(async () => {
    port = await getFreePort();
    receiver = require("../webhook-receiver.cjs");
  });

  afterEach(() => {
    try { receiver.stopWebhookReceiver(); } catch {}
  });

  function postJson(path, body, headers = {}) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const opts = {
        hostname: "127.0.0.1",
        port,
        path,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data), ...headers },
      };
      const req = http.request(opts, (res) => {
        let body = "";
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(body || "null") }));
      });
      req.on("error", reject);
      req.write(data);
      req.end();
    });
  }

  it("starts and stops without error", () => {
    const result = receiver.startWebhookReceiver({ log });
    expect(result).toHaveProperty("port");
    expect(result).toHaveProperty("secret");
    expect(typeof result.secret).toBe("string");
    expect(result.secret.length).toBe(64);
    receiver.stopWebhookReceiver();
  });

  it("receives a POST webhook and calls onEvent", async () => {
    receiver.startWebhookReceiver({ port, log });
    await new Promise((r) => setTimeout(r, 300));

    const events = [];
    receiver.setEventHandler((event) => events.push(event));

    const res = await postJson("/github/push", { action: "push", ref: "main" });
    expect(res.status).toBe(200);
    expect(events.length).toBe(1);
    expect(events[0].method).toBe("POST");
    expect(events[0].url).toBe("/github/push");
    expect(events[0].body.action).toBe("push");
  }, 10000);

  it("rejects invalid x-webhook-signature with 403", async () => {
    receiver.startWebhookReceiver({ port, log });
    await new Promise((r) => setTimeout(r, 300));

    const events = [];
    receiver.setEventHandler((event) => events.push(event));

    const res = await postJson("/test", { foo: "bar" }, { "x-webhook-signature": "wrong-secret" });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("invalid signature");
    expect(events.length).toBe(0);
  }, 10000);

  it("accepts valid x-webhook-signature", async () => {
    const result = receiver.startWebhookReceiver({ port, log });
    await new Promise((r) => setTimeout(r, 300));

    const events = [];
    receiver.setEventHandler((event) => events.push(event));

    const res = await postJson("/stripe/checkout", { type: "checkout.session.completed" }, { "x-webhook-signature": result.secret });
    expect(res.status).toBe(200);
    expect(events.length).toBe(1);
  }, 10000);

  it("handles GET requests without body", async () => {
    receiver.startWebhookReceiver({ port, log });
    await new Promise((r) => setTimeout(r, 300));

    const events = [];
    receiver.setEventHandler((event) => events.push(event));

    const res = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/health`, (res) => {
        let body = "";
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(body || "null") }));
      }).on("error", reject);
    });

    expect(res.status).toBe(200);
    expect(events.length).toBe(1);
    expect(events[0].method).toBe("GET");
    expect(events[0].body).toBeNull();
  }, 10000);

  it("handles invalid JSON body gracefully", async () => {
    receiver.startWebhookReceiver({ port, log });
    await new Promise((r) => setTimeout(r, 300));

    const events = [];
    receiver.setEventHandler((event) => events.push(event));

    const res = await new Promise((resolve, reject) => {
      const req = http.request({ hostname: "127.0.0.1", port, path: "/test", method: "POST", headers: { "Content-Type": "application/json" } }, (res) => {
        let body = "";
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(body || "null") }));
      });
      req.on("error", reject);
      req.write("not-json-at-all");
      req.end();
    });

    expect(res.status).toBe(400);
    expect(events.length).toBe(0);
  }, 10000);

  it("does not restart if already running", () => {
    const first = receiver.startWebhookReceiver({ port, log });
    const second = receiver.startWebhookReceiver({ port, log });
    expect(second.port).toBe(first.port);
    expect(second.secret).toBe(first.secret);
    receiver.stopWebhookReceiver();
  });
});
