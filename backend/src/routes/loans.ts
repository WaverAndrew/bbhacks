import { Router } from "express";
import { VAULT_ACCOUNT_SEED, RLUSD_ISSUER_ADDRESS, RLUSD_CURRENCY } from "../config";
import * as db from "../db/queries";
import { sendRLUSD } from "../xrpl/payments";

export const loansRouter = Router();

const FIXED_RATE = "0.05"; // 5% for MVP

/**
 * POST /loan/apply
 * Body: { borrowerAddress, principal, tenorDays }
 */
loansRouter.post("/apply", async (req, res) => {
  try {
    const { borrowerAddress, principal, tenorDays } = req.body as {
      borrowerAddress: string;
      principal: string;
      tenorDays?: number;
    };
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
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message ?? "unknown error" });
  }
});

/**
 * POST /loan/draw
 * Disburse loan: send principal from Vault to borrower.
 * Body: { loanId }
 */
loansRouter.post("/draw", async (req, res) => {
  try {
    const { loanId } = req.body as { loanId: number };
    const loan = await db.getLoan(loanId);
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }
    if (loan.status !== "pending") {
      return res.status(400).json({ error: "Loan already drawn or repaid" });
    }
    if (!VAULT_ACCOUNT_SEED || !RLUSD_ISSUER_ADDRESS) {
      return res.status(500).json({ error: "Vault/issuer not configured" });
    }
    const result = await sendRLUSD({
      fromSeed: VAULT_ACCOUNT_SEED,
      toAddress: loan.borrower_address,
      amount: loan.principal,
      currency: RLUSD_CURRENCY,
      issuer: RLUSD_ISSUER_ADDRESS,
    });
    await db.updateLoanStatus(loanId, "drawn");
    res.json({
      txHash: (result.result as any).hash ?? "",
      amount: loan.principal,
      borrower: loan.borrower_address,
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message ?? "unknown error" });
  }
});

/**
 * POST /loan/repay
 * Mark loan as repaid (actual repayment is borrower sending RLUSD to Vault in frontend).
 * Body: { loanId }
 */
loansRouter.post("/repay", async (req, res) => {
  try {
    const { loanId } = req.body as { loanId: number };
    const loan = await db.getLoan(loanId);
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }
    await db.updateLoanStatus(loanId, "repaid");
    res.json({ success: true, loanId });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message ?? "unknown error" });
  }
});

/**
 * GET /loan/list?borrower=...
 */
loansRouter.get("/list", async (req, res) => {
  try {
    const borrower = req.query.borrower as string | undefined;
    const list = await db.listLoans(borrower);
    res.json({ loans: list });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message ?? "unknown error" });
  }
});
