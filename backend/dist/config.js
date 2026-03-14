"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VRLUSD_CURRENCY = exports.PORT = exports.ORACLE_ACCOUNT_SEED = exports.COVERAGE_NFT_ISSUER_SEED = exports.VAULT_ACCOUNT_SEED = exports.VAULT_ACCOUNT_ADDRESS = exports.RLUSD_CURRENCY = exports.RLUSD_ISSUER_ADDRESS = exports.XRPL_NETWORK_URL = void 0;
exports.XRPL_NETWORK_URL = process.env.XRPL_NETWORK_URL ?? "wss://s.altnet.rippletest.net:51233";
exports.RLUSD_ISSUER_ADDRESS = process.env.RLUSD_ISSUER_ADDRESS ?? "";
exports.RLUSD_CURRENCY = process.env.RLUSD_CURRENCY ?? "RLS";
exports.VAULT_ACCOUNT_ADDRESS = process.env.VAULT_ACCOUNT_ADDRESS ?? "";
exports.VAULT_ACCOUNT_SEED = process.env.VAULT_ACCOUNT_SEED ?? "";
exports.COVERAGE_NFT_ISSUER_SEED = process.env.COVERAGE_NFT_ISSUER_SEED ?? "";
exports.ORACLE_ACCOUNT_SEED = process.env.ORACLE_ACCOUNT_SEED ?? "";
exports.PORT = Number(process.env.PORT ?? "4000");
exports.VRLUSD_CURRENCY = "VRLS";
//# sourceMappingURL=config.js.map