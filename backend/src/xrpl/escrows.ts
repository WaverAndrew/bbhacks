/**
 * XRPL escrows (skill-aligned): autofill for LastLedgerSequence, submitAndWait for validation.
 */
import { Wallet } from "xrpl";
import { getClient } from "./client";

export async function createEscrow(params: {
  fromSeed: string;
  destination: string;
  amount: { currency: string; issuer: string; value: string };
  finishAfter?: number;
  cancelAfter?: number;
  memo?: string;
}) {
  const { fromSeed, destination, amount, finishAfter, cancelAfter, memo } =
    params;
  const client = await getClient();
  const wallet = Wallet.fromSeed(fromSeed);

  const tx: any = {
    TransactionType: "EscrowCreate",
    Account: wallet.address,
    Destination: destination,
    Amount: amount,
  };

  if (finishAfter) tx.FinishAfter = finishAfter;
  if (cancelAfter) tx.CancelAfter = cancelAfter;
  if (memo) {
    tx.Memos = [
      {
        Memo: {
          MemoData: Buffer.from(memo, "utf8").toString("hex"),
        },
      },
    ];
  }

  const prepared = await client.autofill(tx);
  const signed = wallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);
  return result;
}

export async function finishEscrow(params: {
  fromSeed: string;
  owner: string;
  offerSequence: number;
}) {
  const { fromSeed, owner, offerSequence } = params;
  const client = await getClient();
  const wallet = Wallet.fromSeed(fromSeed);

  const tx = {
    TransactionType: "EscrowFinish",
    Account: wallet.address,
    Owner: owner,
    OfferSequence: offerSequence,
  } as const;

  const prepared = await client.autofill(tx);
  const signed = wallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);
  return result;
}

