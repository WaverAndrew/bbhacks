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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.oracleRouter = void 0;
const express_1 = require("express");
const config_1 = require("../config");
const db = __importStar(require("../db/queries"));
const tokens_1 = require("../xrpl/tokens");
const payments_1 = require("../xrpl/payments");
exports.oracleRouter = (0, express_1.Router)();
/**
 * POST /oracle/voyages/:id/incident
 * Pay out insured amount from Vault to policy owner, burn coverage NFT, mark resolved.
 */
exports.oracleRouter.post("/voyages/:id/incident", async (req, res) => {
    try {
        const voyageId = req.params.id;
        const voyage = await db.getVoyage(voyageId);
        if (!voyage) {
            return res.status(404).json({ error: "Voyage not found" });
        }
        const policies = await db.listPolicies(undefined, voyageId);
        const activePolicy = policies.find((p) => p.status === "active");
        if (!activePolicy) {
            return res.status(400).json({ error: "No active policy for this voyage" });
        }
        if (!config_1.VAULT_ACCOUNT_SEED || !config_1.RLUSD_ISSUER_ADDRESS) {
            return res.status(500).json({ error: "Vault/issuer not configured" });
        }
        const insuredAmount = voyage.insured_amount;
        const result = await (0, payments_1.sendRLUSD)({
            fromSeed: config_1.VAULT_ACCOUNT_SEED,
            toAddress: activePolicy.owner_address,
            amount: insuredAmount,
            currency: config_1.RLUSD_CURRENCY,
            issuer: config_1.RLUSD_ISSUER_ADDRESS,
        });
        const payoutTxHash = result.result.hash ?? "";
        if (activePolicy.nft_id) {
            await (0, tokens_1.burnCoverageNFTByIssuer)(activePolicy.nft_id);
        }
        await db.updatePolicyStatus(activePolicy.id, "claim_paid");
        await db.updateVoyageStatus(voyageId, "incident_paid");
        res.json({
            success: true,
            payoutTxHash,
            paidTo: activePolicy.owner_address,
            amount: insuredAmount,
            message: "Claim paid in RLUSD from Vault; coverage NFT burned.",
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: e?.message ?? "unknown error" });
    }
});
/**
 * POST /oracle/voyages/:id/no-incident
 * No payout; burn coverage NFT, mark voyage as expired (premium stays in Vault).
 */
exports.oracleRouter.post("/voyages/:id/no-incident", async (req, res) => {
    try {
        const voyageId = req.params.id;
        const voyage = await db.getVoyage(voyageId);
        if (!voyage) {
            return res.status(404).json({ error: "Voyage not found" });
        }
        const policies = await db.listPolicies(undefined, voyageId);
        const activePolicy = policies.find((p) => p.status === "active");
        if (!activePolicy) {
            return res.status(400).json({ error: "No active policy for this voyage" });
        }
        let burnTxHash = "";
        if (activePolicy.nft_id) {
            const burnResult = await (0, tokens_1.burnCoverageNFTByIssuer)(activePolicy.nft_id);
            burnTxHash = burnResult.txHash;
        }
        await db.updatePolicyStatus(activePolicy.id, "expired");
        await db.updateVoyageStatus(voyageId, "no_incident");
        res.json({
            success: true,
            burnTxHash,
            message: "No incident; coverage NFT burned. Premium remains in Vault.",
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: e?.message ?? "unknown error" });
    }
});
/**
 * GET /oracle/voyages - list voyages for admin dropdown
 */
exports.oracleRouter.get("/voyages", async (_req, res) => {
    try {
        const voyages = await db.listVoyages();
        res.json({ voyages });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: e?.message ?? "unknown error" });
    }
});
//# sourceMappingURL=oracle.js.map