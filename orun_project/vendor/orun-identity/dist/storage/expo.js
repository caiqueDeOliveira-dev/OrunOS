"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpoSecureTokenStore = void 0;
class ExpoSecureTokenStore {
    constructor(secureStore) {
        this.secureStore = secureStore;
        this.managedKeys = new Set();
    }
    async getItem(key) {
        return this.secureStore.getItemAsync(key);
    }
    async setItem(key, value) {
        this.managedKeys.add(key);
        await this.secureStore.setItemAsync(key, value);
    }
    async removeItem(key) {
        this.managedKeys.delete(key);
        await this.secureStore.deleteItemAsync(key);
    }
    async clear() {
        await Promise.all(Array.from(this.managedKeys).map((key) => this.secureStore.deleteItemAsync(key)));
        this.managedKeys.clear();
    }
}
exports.ExpoSecureTokenStore = ExpoSecureTokenStore;
//# sourceMappingURL=expo.js.map