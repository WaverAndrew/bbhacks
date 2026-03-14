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
exports.coverageRouter = void 0;
const express_1 = require("express");
const db = __importStar(require("../db/queries"));
const tokens_1 = require("../xrpl/tokens");
exports.coverageRouter = (0, express_1.Router)();
const PREMIUM_RATE = 0.02; // 2% of insured amount for MVP
/**
 * POST /coverage/quote
 * Body: { insuredAmount, startDate, endDate }
 */
exports.coverageRouter.post("/quote", (req, res) => {
    const { insuredAmount, startDate, endDate } = req.body;
    const amount = Number(insuredAmount) || 0;
    const premium = (amount * PREMIUM_RATE).toFixed(2);
    res.json({ premium, insuredAmount: String(amount), startDate, endDate });
});
/**
 * POST /coverage/bind
 * Exporter has already sent premium RLUSD to Vault (frontend). We create voyage, mint coverage NFT, record policy.
 * Body: { voyageId, routeName, insuredAmount, startDate, endDate, premiumAmount, ownerAddress }
 */
exports.coverageRouter.post("/bind", async (req, res) => {
    try {
        const { voyageId, routeName, insuredAmount, startDate, endDate, premiumAmount, ownerAddress, } = req.body;
        if (!voyageId || !ownerAddress || !premiumAmount) {
            return res.status(400).json({ error: "voyageId, ownerAddress, premiumAmount required" });
        }
        const existing = await db.getVoyage(voyageId);
        if (existing) {
            return res.status(400).json({ error: "Voyage already exists" });
        }
        await db.insertVoyage({
            id: voyageId,
            route_name: routeName || voyageId,
            insured_amount: insuredAmount || "0",
            start_date: startDate || new Date().toISOString(),
            end_date: endDate || new Date().toISOString(),
            status: "active",
        });
        const metadataUri = `https://vault.example/policy/${voyageId}`;
        const { nftId, txHash } = await (0, tokens_1.mintCoverageNFT)(voyageId, metadataUri);
        const policyId = await db.insertPolicy({
            voyage_id: voyageId,
            owner_address: ownerAddress,
            premium_amount: premiumAmount,
            nft_id: nftId,
            status: "active",
        });
        res.json({
            policyId,
            voyageId,
            nftId,
            txHash,
            message: "Your RLUSD premium is now locked; coverage NFT minted on XRPL.",
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: e?.message ?? "unknown error" });
    }
});
/**
 * GET /coverage/policies?owner=...&voyageId=...
 */
exports.coverageRouter.get("/policies", async (req, res) => {
    try {
        const owner = req.query.owner;
        const voyageId = req.query.voyageId;
        const list = await db.listPolicies(owner, voyageId);
        res.json({ policies: list });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: e?.message ?? "unknown error" });
    }
});
//# sourceMappingURL=coverage.js.map