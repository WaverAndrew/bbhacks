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
exports.loansRouter = void 0;
const express_1 = require("express");
const config_1 = require("../config");
const db = __importStar(require("../db/queries"));
const payments_1 = require("../xrpl/payments");
exports.loansRouter = (0, express_1.Router)();
const FIXED_RATE = "0.05"; // 5% for MVP
/**
 * POST /loan/apply
 * Body: { borrowerAddress, principal, tenorDays }
 */
exports.loansRouter.post("/apply", async (req, res) => {
    try {
        const { borrowerAddress, principal, tenorDays } = req.body;
        if (!borrowerAddress || !principal) {
            return res.status(400).json({ error: "borrowerAddress and principal required" });
        }
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (Number(tenorDays) || 30));
        const loanId = await db.insertLoan({
            borrower_address: borrowerAddress,
            principal,
            rate: FIXED_RATE,
            due_date: dueDate.toISOString(),
            status: "pending",
        });
        res.json({ loanId, dueDate: dueDate.toISOString(), rate: FIXED_RATE });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: e?.message ?? "unknown error" });
    }
});
/**
 * POST /loan/draw
 * Disburse loan: send principal from Vault to borrower.
 * Body: { loanId }
 */
exports.loansRouter.post("/draw", async (req, res) => {
    try {
        const { loanId } = req.body;
        const loan = await db.getLoan(loanId);
        if (!loan) {
            return res.status(404).json({ error: "Loan not found" });
        }
        if (loan.status !== "pending") {
            return res.status(400).json({ error: "Loan already drawn or repaid" });
        }
        if (!config_1.VAULT_ACCOUNT_SEED || !config_1.RLUSD_ISSUER_ADDRESS) {
            return res.status(500).json({ error: "Vault/issuer not configured" });
        }
        const result = await (0, payments_1.sendRLUSD)({
            fromSeed: config_1.VAULT_ACCOUNT_SEED,
            toAddress: loan.borrower_address,
            amount: loan.principal,
            currency: config_1.RLUSD_CURRENCY,
            issuer: config_1.RLUSD_ISSUER_ADDRESS,
        });
        await db.updateLoanStatus(loanId, "drawn");
        res.json({
            txHash: result.result.hash ?? "",
            amount: loan.principal,
            borrower: loan.borrower_address,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: e?.message ?? "unknown error" });
    }
});
/**
 * POST /loan/repay
 * Mark loan as repaid (actual repayment is borrower sending RLUSD to Vault in frontend).
 * Body: { loanId }
 */
exports.loansRouter.post("/repay", async (req, res) => {
    try {
        const { loanId } = req.body;
        const loan = await db.getLoan(loanId);
        if (!loan) {
            return res.status(404).json({ error: "Loan not found" });
        }
        await db.updateLoanStatus(loanId, "repaid");
        res.json({ success: true, loanId });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: e?.message ?? "unknown error" });
    }
});
/**
 * GET /loan/list?borrower=...
 */
exports.loansRouter.get("/list", async (req, res) => {
    try {
        const borrower = req.query.borrower;
        const list = await db.listLoans(borrower);
        res.json({ loans: list });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: e?.message ?? "unknown error" });
    }
});
//# sourceMappingURL=loans.js.map