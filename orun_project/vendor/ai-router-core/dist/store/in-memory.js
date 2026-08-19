"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemorySemanticCacheStore = exports.InMemoryUsageLogStore = exports.InMemorySkillStore = exports.InMemorySecretStore = exports.InMemoryProviderConfigStore = exports.InMemoryComboStore = void 0;
const free_combo_1 = require("../providers/free-combo");
/** Só pra dev local / testes. A versão real vira @orun/settings + SQLite. */
class InMemoryComboStore {
    combos = new Map(free_combo_1.BUILTIN_FREE_COMBOS.map((c) => [c.id, c]));
    async getCombo(comboId) {
        return this.combos.get(comboId) ?? null;
    }
    async listCombos() {
        return [...this.combos.values()];
    }
    async saveCombo(combo) {
        this.combos.set(combo.id, combo);
    }
    async deleteCombo(comboId) {
        this.combos.delete(comboId);
    }
}
exports.InMemoryComboStore = InMemoryComboStore;
class InMemoryProviderConfigStore {
    configs = new Map();
    key(providerId, accountLabel) {
        return `${providerId}:${accountLabel ?? "default"}`;
    }
    async getConfig(providerId, accountLabel) {
        return this.configs.get(this.key(providerId, accountLabel)) ?? null;
    }
    async listConfigs() {
        return [...this.configs.values()];
    }
    async saveConfig(config) {
        this.configs.set(this.key(config.providerId, config.accountLabel), config);
    }
    async deleteConfig(providerId) {
        for (const [k] of this.configs) {
            if (k.startsWith(`${providerId}:`))
                this.configs.delete(k);
        }
    }
}
exports.InMemoryProviderConfigStore = InMemoryProviderConfigStore;
class InMemorySecretStore {
    secrets = new Map();
    key(providerId, accountLabel) {
        return `${providerId}:${accountLabel ?? "default"}`;
    }
    async getCredential(providerId, accountLabel) {
        return this.secrets.get(this.key(providerId, accountLabel)) ?? null;
    }
    async setCredential(providerId, credential, accountLabel) {
        this.secrets.set(this.key(providerId, accountLabel), credential);
    }
}
exports.InMemorySecretStore = InMemorySecretStore;
class InMemorySkillStore {
    skills = new Map();
    seed(skill) {
        this.skills.set(skill.id, skill);
    }
    async getSkill(skillId) {
        return this.skills.get(skillId) ?? null;
    }
}
exports.InMemorySkillStore = InMemorySkillStore;
class InMemoryUsageLogStore {
    events = [];
    async record(event) {
        this.events.push(event);
    }
    async listRecent(comboId, limit = 50) {
        const filtered = comboId ? this.events.filter((e) => e.comboId === comboId) : this.events;
        return filtered.slice(-limit).reverse();
    }
}
exports.InMemoryUsageLogStore = InMemoryUsageLogStore;
class InMemorySemanticCacheStore {
    entries = [];
    async listByCombo(comboId) {
        return this.entries.filter((e) => e.comboId === comboId);
    }
    async add(entry) {
        this.entries.push(entry);
    }
    async prune(comboId, maxEntries) {
        const forCombo = this.entries.filter((e) => e.comboId === comboId).sort((a, b) => b.createdAt - a.createdAt);
        const keep = new Set(forCombo.slice(0, maxEntries));
        this.entries = this.entries.filter((e) => e.comboId !== comboId || keep.has(e));
    }
}
exports.InMemorySemanticCacheStore = InMemorySemanticCacheStore;
//# sourceMappingURL=in-memory.js.map