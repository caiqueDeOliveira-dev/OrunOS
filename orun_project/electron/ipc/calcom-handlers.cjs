// electron/ipc/calcom-handlers.cjs
//
// IPC handlers for Cal.com self-hosted integration.

function register(ipcMain, ctx) {
  const calcom = () => ctx.calcom;
  if (!calcom()) return;

  ipcMain.handle("calcom:health", async () => {
    try { return { ok: true, data: await calcom().healthCheck() }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });

  ipcMain.handle("calcom:list-event-types", async () => {
    try { return { ok: true, data: await calcom().listEventTypes() }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });

  ipcMain.handle("calcom:get-availability", async (_ev, opts) => {
    try { return { ok: true, data: await calcom().getAvailability(opts) }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });

  ipcMain.handle("calcom:find-slots", async (_ev, opts) => {
    try { return { ok: true, data: await calcom().findNextSlots(opts) }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });

  ipcMain.handle("calcom:create-booking", async (_ev, input) => {
    try { return { ok: true, data: await calcom().createBooking(input) }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });

  ipcMain.handle("calcom:cancel-booking", async (_ev, input) => {
    try { return { ok: true, data: await calcom().cancelBooking(input) }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });

  ipcMain.handle("calcom:reserve-slot", async (_ev, input) => {
    try { return { ok: true, data: await calcom().reserveSlot(input) }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
}

module.exports = { register };
