/**
 * XRPL payments (skill-aligned):
 * - Uses autofill() for Fee, Sequence, LastLedgerSequence (reliable submission).
 * - submitAndWait() so we only return after validation, not just submission.
 * - XRP amounts via xrpToDrops(); issued currency as string value (no float).
 * - Fee protection via Client maxFeeXRP (set in client.ts).
 * - If ever processing INCOMING payments (e.g. webhooks), use meta.delivered_amount, not Amount.
 */
import { Wallet, xrpToDrops } from "xrpl";
import { getClient } from "./client";

export async function sendRLUSD(params: {
  fromSeed: string;
  toAddress: string;
  amount: string;
  currency: string;
  issuer: string;
}) {
  const { fromSeed, toAddress, amount, currency, issuer } = params;
  const client = await getClient();
  const wallet = Wallet.fromSeed(fromSeed);

  const tx = {
    TransactionType: "Payment",
    Account: wallet.address,
    Destination: toAddress,
    Amount: {
      currency,
      issuer,
      value: amount,
    },
  } as const;

  const prepared = await client.autofill(tx);
  const signed = wallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);
  return result;
}

export async function sendXRP(params: {
  fromSeed: string;
  toAddress: string;
  amountXrp: string;
}) {
  const { fromSeed, toAddress, amountXrp } = params;
  const client = await getClient();
  const wallet = Wallet.fromSeed(fromSeed);

  const tx = {
    TransactionType: "Payment",
    Account: wallet.address,
    Destination: toAddress,
    Amount: xrpToDrops(amountXrp),
  } as const;

  const prepared = await client.autofill(tx);
  const signed = wallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);
  return result;
}

