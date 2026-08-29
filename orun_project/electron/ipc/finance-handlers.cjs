function register(ipcMain, ctx) {
  const finance = () => ctx.financeStore;
  
  ipcMain.handle("finance:list-accounts", async () => {
    try { return { ok: true, data: await finance().listAccounts() }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("finance:list-categories", async () => {
    try { return { ok: true, data: await finance().listCategories() }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("finance:list-transactions", async (_event, accountId, options) => {
    try { return { ok: true, data: await finance().listTransactions(accountId, options) }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("finance:get-budget-month", async (_event, month) => {
    try { return { ok: true, data: await finance().getBudgetMonth(month) }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("finance:create-transaction", async (_event, input) => {
    try { return { ok: true, data: await finance().createTransaction(input) }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("finance:categorize-transaction", async (_event, transactionId, categoryId) => {
    try { await finance().categorizeTransaction(transactionId, categoryId); return { ok: true }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("finance:set-budget-amount", async (_event, categoryId, month, amountCents) => {
    try { await finance().setBudgetAmount(categoryId, month, amountCents); return { ok: true }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("finance:sync", async () => {
    try { await finance().sync(); return { ok: true }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
}
module.exports = { register };
