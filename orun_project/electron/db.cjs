const core = require("./db/core.cjs");
const domain = require("./db/domain.cjs");
const { dbEncryption } = require("./db-encryption.cjs");

module.exports = { ...core, ...domain, dbEncryption };
