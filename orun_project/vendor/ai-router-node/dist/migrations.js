"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
const MIGRATIONS = [
    {
        version: 1,
        up: `
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `,
    },
    {
        version: 2,
        up: null, // handled programmatically below
    },
    {
        version: 3,
        up: `
      CREATE TABLE IF NOT EXISTS budget_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        daily_limit REAL DEFAULT 10,
        monthly_limit REAL DEFAULT 200,
        alert_threshold INTEGER DEFAULT 80,
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `,
    },
    {
        version: 4,
        up: null, // handled programmatically below (re-seed dos combos builtin)
    },
];
function runMigrations(db) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);
    const applied = new Set(db.prepare("SELECT version FROM _migrations").all().map((r) => r.version));
    for (const migration of MIGRATIONS) {
        if (!applied.has(migration.version)) {
            console.log(`[migration] Applying v${migration.version}...`);
            if (migration.version === 2) {
                // SQLite doesn't support ADD COLUMN IF NOT EXISTS; check first
                const cols = db.prepare("PRAGMA table_info(usage_events)").all();
                if (!cols.some((c) => c.name === "request_id")) {
                    db.exec(`ALTER TABLE usage_events ADD COLUMN request_id TEXT`);
                }
            }
            else if (migration.version === 4) {
                // Re-seed dos combos builtin: o seed original usava INSERT OR IGNORE
                // e nunca atualizava combos que já existiam com a definição antiga
                // (kiro→opencode-free→vertex). Com o schema evoluindo (groq/gemini/
                // openrouter/ollama), o banco real ficava preso na definição velha.
                // Aqui fazemos upsert (ON CONFLICT DO UPDATE) dos combos builtin SEM
                // tocar em combos customizados criados pelo usuário.
                const core = require("@orun/ai-router-core");
                const builtin = core.BUILTIN_FREE_COMBOS || [];
                const upsert = db.prepare(`INSERT INTO combos (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`);
                const tx = db.transaction((combos) => {
                    for (const combo of combos)
                        upsert.run(combo.id, JSON.stringify(combo));
                });
                tx(builtin);
                console.log(`[migration] v4 re-seeder: ${builtin.length} combos builtin upsertados.`);
            }
            else if (migration.up) {
                db.exec(migration.up);
            }
            db.prepare("INSERT INTO _migrations (version) VALUES (?)").run(migration.version);
            console.log(`[migration] v${migration.version} applied.`);
        }
    }
}
//# sourceMappingURL=migrations.js.map