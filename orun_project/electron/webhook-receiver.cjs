// webhook-receiver.cjs
// Local HTTP server that receives external webhooks (GitHub, Stripe, etc.)
// and forwards them as IPC events to the renderer.

const http = require("http");
const { randomBytes } = require("crypto");

const DEFAULT_PORT = 8082;
let server = null;
let webhookSecret = "";
let onEvent = null;

function generateSecret() {
  return randomBytes(32).toString("hex");
}

function startWebhookReceiver({ port = DEFAULT_PORT, log } = {}) {
  if (server) return { port: server.address()?.port || port, secret: webhookSecret };

  webhookSecret = process.env.WEBHOOK_SECRET || generateSecret();

  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk.toString(); });
    req.on("end", () => {
      try {
        const event = {
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: body ? JSON.parse(body) : null,
          timestamp: Date.now(),
          source: req.headers["user-agent"] || "unknown",
        };

        // Validate signature if provided
        const signature = req.headers["x-webhook-signature"];
        if (signature && signature !== webhookSecret) {
          log.warn("[webhook] Invalid signature rejected");
          res.writeHead(403);
          res.end('{"error":"invalid signature"}');
          return;
        }

        log.info(`[webhook] Received ${req.method} ${req.url} from ${event.source}`);

        if (onEvent) onEvent(event);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        log.error("[webhook] Error processing:", err.message);
        res.writeHead(400);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  });

  server.listen(port, "127.0.0.1", () => {
    const actualPort = server.address().port;
    log.info(`[webhook] Receiver listening on http://127.0.0.1:${actualPort}`);
    log.info(webhookSecret
      ? "[webhook] Webhook secret configured (not logged for security)"
      : "[webhook] WARNING: no webhook secret configured");
  });

  server.on("error", (err) => {
    log.error("[webhook] Server error:", err.message);
    server = null;
  });

  const boundPort = server.address()?.port || port;
  return { port: boundPort, secret: webhookSecret };
}

function setEventHandler(handler) {
  onEvent = handler;
}

function stopWebhookReceiver() {
  if (server) {
    server.close();
    server = null;
  }
}

module.exports = {
  startWebhookReceiver,
  stopWebhookReceiver,
  setEventHandler,
};
