// electron/ipc/event-bus-handlers.cjs
// Handlers IPC do Event Bus — pub/sub entre main e renderer.
//
// Padrão:
//   event-bus:emit       → publica evento (renderer → main)
//   event-bus:subscribe  → registra listener (renderer → main)
//   event-bus:once       → registra listener one-shot
//   event-bus:history    → retorna histórico
//   event-bus:stats      → retorna stats
//   event-bus:event      → push de evento do main → renderer (para subs ativos)

function register(ipcMain, ctx) {
  const bus = () => ctx.eventBus;

  // Renderer publica evento
  ipcMain.handle("event-bus:emit", async (_event, { topic, data, meta } = {}) =>
    bus().emit(topic || "", data || {}, meta || {})
  );

  // Renderer busca histórico
  ipcMain.handle("event-bus:history", async (_event, filter = {}) =>
    bus().getHistory(filter)
  );

  // Renderer busca stats
  ipcMain.handle("event-bus:stats", () => bus().stats());

  // Renderer se inscreve — retorna subId; eventos chegam via
  // canal push event-bus:event:{subId}
  // IMPORTANTE: sendSync BLOQUEIA o renderer até event.returnValue ser setado.
  // Qualquer return/exceção sem responder = renderer congelado pra sempre.
  ipcMain.on("event-bus:subscribe", (event, { subId, topics } = {}) => {
    try {
      if (!subId || !Array.isArray(topics)) {
        event.returnValue = { ok: false, error: "bad-args" };
        return;
      }
      const eventBus = bus();
      if (!eventBus) {
        console.warn("[event-bus] subscribe antes do bus estar pronto (subId " + subId + ")");
        event.returnValue = { ok: false, error: "bus-not-ready" };
        return;
      }

      const { unsubscribe } = eventBus.subscribe(topics, (evt) => {
        if (event.sender.isDestroyed()) {
          unsubscribe();
          return;
        }
        try {
          event.sender.send(`event-bus:event:${subId}`, evt);
        } catch {
          unsubscribe();
        }
      });

      // Salva unsubscribe para uso futuro
      event.sender.on("destroyed", () => unsubscribe());

      // Armazena no reply para o renderer poder cancelar
      event.returnValue = { ok: true, subId };
    } catch (err) {
      try { console.error("[event-bus] subscribe falhou:", err?.message || err); } catch {}
      event.returnValue = { ok: false, error: String(err?.message || err) };
    }
  });

  // Renderer cancela inscrição por subId
  ipcMain.on("event-bus:unsubscribe", (_event, { subId } = {}) => {
    try {
      if (subId) bus()?.unsubscribeById(subId);
    } catch {}
    _event.returnValue = { ok: true };
  });
}

module.exports = { register };
