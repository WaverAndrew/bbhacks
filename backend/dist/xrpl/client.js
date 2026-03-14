"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClient = getClient;
exports.disconnectClient = disconnectClient;
/**
 * XRPL client (skill-aligned): explicit testnet default, maxFeeXRP for fee protection, disconnect on shutdown.
 */
const xrpl_1 = require("xrpl");
const config_1 = require("../config");
let client = null;
async function getClient() {
    if (client && client.isConnected()) {
        return client;
    }
    client = new xrpl_1.Client(config_1.XRPL_NETWORK_URL, { maxFeeXRP: "0.01" });
    await client.connect();
    return client;
}
async function disconnectClient() {
    if (client && client.isConnected()) {
        await client.disconnect();
    }
}
//# sourceMappingURL=client.js.map