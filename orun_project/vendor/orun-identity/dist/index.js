"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPasswordPwned = exports.PrivacyClient = exports.LicenseManager = exports.useEntitlements = exports.EntitlementsResolver = exports.useAuthBridge = exports.useAuth = exports.WebCryptoSecureTokenStore = exports.ExpoSecureTokenStore = exports.ElectronSecureTokenStore = exports.AuditLogger = exports.SessionRegistry = exports.AuthClient = void 0;
__exportStar(require("./types"), exports);
__exportStar(require("./storage/ISecureTokenStore"), exports);
var AuthClient_1 = require("./core/AuthClient");
Object.defineProperty(exports, "AuthClient", { enumerable: true, get: function () { return AuthClient_1.AuthClient; } });
var SessionRegistry_1 = require("./core/SessionRegistry");
Object.defineProperty(exports, "SessionRegistry", { enumerable: true, get: function () { return SessionRegistry_1.SessionRegistry; } });
var AuditLogger_1 = require("./core/AuditLogger");
Object.defineProperty(exports, "AuditLogger", { enumerable: true, get: function () { return AuditLogger_1.AuditLogger; } });
var electron_1 = require("./storage/electron");
Object.defineProperty(exports, "ElectronSecureTokenStore", { enumerable: true, get: function () { return electron_1.ElectronSecureTokenStore; } });
var expo_1 = require("./storage/expo");
Object.defineProperty(exports, "ExpoSecureTokenStore", { enumerable: true, get: function () { return expo_1.ExpoSecureTokenStore; } });
var webcrypto_1 = require("./storage/webcrypto");
Object.defineProperty(exports, "WebCryptoSecureTokenStore", { enumerable: true, get: function () { return webcrypto_1.WebCryptoSecureTokenStore; } });
var useAuth_1 = require("./hooks/useAuth");
Object.defineProperty(exports, "useAuth", { enumerable: true, get: function () { return useAuth_1.useAuth; } });
Object.defineProperty(exports, "useAuthBridge", { enumerable: true, get: function () { return useAuth_1.useAuthBridge; } });
var EntitlementsResolver_1 = require("./core/EntitlementsResolver");
Object.defineProperty(exports, "EntitlementsResolver", { enumerable: true, get: function () { return EntitlementsResolver_1.EntitlementsResolver; } });
var useEntitlements_1 = require("./hooks/useEntitlements");
Object.defineProperty(exports, "useEntitlements", { enumerable: true, get: function () { return useEntitlements_1.useEntitlements; } });
var LicenseManager_1 = require("./core/LicenseManager");
Object.defineProperty(exports, "LicenseManager", { enumerable: true, get: function () { return LicenseManager_1.LicenseManager; } });
var PrivacyClient_1 = require("./core/PrivacyClient");
Object.defineProperty(exports, "PrivacyClient", { enumerable: true, get: function () { return PrivacyClient_1.PrivacyClient; } });
var passwordSecurity_1 = require("./core/passwordSecurity");
Object.defineProperty(exports, "checkPasswordPwned", { enumerable: true, get: function () { return passwordSecurity_1.checkPasswordPwned; } });
//# sourceMappingURL=index.js.map