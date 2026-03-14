# Trade Assurance Vault

A DeFi dApp on **XRPL Testnet** that pools RLUSD liquidity, sells simple parametric voyage coverage, and funds short-term SME credit. Built for hackathon demo.

## Problem

High-risk trade/shipping corridors (e.g. Hormuz-type risk) are expensive or uninsurable, especially for SMEs. This MVP shows how XRPL can:

- Pool RLUSD in a single-asset vault
- Sell parametric coverage for a single voyage (premium → vault, coverage NFT minted)
- Resolve claims via an oracle (incident → payout from vault; no incident → NFT burned, premium stays in vault)
- Optionally disburse small RLUSD loans from the same vault

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (Next.js)                                              │
│  LP Dashboard │ Exporter (coverage) │ Admin / Oracle             │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend (Node.js + TypeScript)                                  │
│  REST API │ XRPL client (xrpl.js) │ SQLite (voyages, policies)   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  XRPL Testnet                                                    │
│  RLUSD issuer │ Vault (holds RLUSD, issues vRLUSD) │ Escrows    │
│  Coverage NFT issuer │ Payments, Trust lines, NFTs               │
└─────────────────────────────────────────────────────────────────┘
```

## Repo structure

- **`backend/`** — Express API, XRPL wrapper (payments, vault, tokens, escrows), SQLite (voyages, policies, loans, vault_state).
- **`frontend/`** — Next.js app: landing, LP (deposit/withdraw, vault metrics), Exporter (quote, bind coverage, policy list), Admin (oracle: incident / no-incident).
- **`scripts/`** — XRPL setup: create/fund RLUSD issuer, create/fund Vault and trust line, fund addresses via faucet.

## Prerequisites

- Node.js 20+
- XRPL Testnet (or Devnet) access

## Environment

**Backend** (`backend/.env` or env vars):

- `XRPL_NETWORK_URL` — e.g. `wss://s.altnet.rippletest.net:51233`
- `RLUSD_ISSUER_ADDRESS` — Demo RLUSD issuer (from scripts).
- `RLUSD_CURRENCY` — e.g. `RLS`
- `VAULT_ACCOUNT_ADDRESS` — Vault account (from scripts).
- `VAULT_ACCOUNT_SEED` — Vault secret (for minting vRLUSD, sending RLUSD).
- `COVERAGE_NFT_ISSUER_SEED` — Account that mints/burns coverage NFTs. For minimal demo you can use the same value as `VAULT_ACCOUNT_SEED`.
- `PORT` — API port (default `4000`).

**Frontend** (`frontend/.env.local`):

- `NEXT_PUBLIC_API_URL` — Backend URL (e.g. `http://localhost:4000`).

**Scripts** (env):

- `XRPL_NETWORK_URL` — same as above.
- `RLUSD_ISSUER_ADDRESS` — for setup-vault (Vault’s trust line to RLUSD).
- `RLUSD_ISSUER_SEED` — optional; if not set, setup-issuer creates a new wallet.
- `VAULT_SEED` — optional; if not set, setup-vault creates a new wallet.

## Run instructions

### 1. Setup XRPL accounts (one-time)

```bash
cd scripts
npm install
# Create and fund RLUSD issuer (save address and seed)
npx ts-node setup-issuer.ts
# Set RLUSD_ISSUER_ADDRESS (and optionally RLUSD_ISSUER_SEED) in env, then:
npx ts-node setup-vault.ts
# Save VAULT_ACCOUNT_ADDRESS and VAULT_ACCOUNT_SEED. Create/fund a separate account for coverage NFTs and set COVERAGE_NFT_ISSUER_SEED in backend.
# Fund any test addresses (e.g. LP, exporter):
npx ts-node fund-faucet.ts rAddr1 rAddr2
```

### 2. Backend

```bash
cd backend
npm install
# Set env vars (see above)
npm run dev
# Or: npm run build && npm start
```

### 3. Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
npm run dev
```

Open http://localhost:3000.

## Testing

See **[TESTING.md](TESTING.md)** for a full guide. Summary:

- **Quick API smoke test** (backend must be running):
  ```bash
  ./scripts/smoke-test-api.sh
  ```
  Or: `curl -s http://localhost:4000/health` and `curl -s http://localhost:4000/lp/vault`.

- **End-to-end**: Follow TESTING.md for one-time XRPL setup (issuer, vault, fund wallets, trust lines, issue RLUSD), then run backend + frontend and walk through LP deposit → Exporter bind coverage → Admin oracle (incident or no incident).

## Demo flow

1. **LP** — Enter wallet address. (Optional: send RLUSD from issuer to your wallet first.) Enter amount and click “Mint vRLUSD” (backend mints vRLUSD to you after you have sent RLUSD to the Vault).
2. **Exporter** — Enter wallet. Create a voyage (ID, route, insured amount, dates). Get quote, then “Confirm coverage”. Backend creates voyage, mints coverage NFT, records policy. Premium is expected to be sent to Vault by the exporter (e.g. from issuer or existing balance).
3. **Oracle** — In Admin, select a voyage and click “Mark Incident” or “Mark No Incident”. Backend pays out RLUSD from Vault to policy owner (incident) or burns NFT and marks no incident.

## XRPL features used

| Feature | Where |
|--------|--------|
| Issued currencies (RLUSD, vRLUSD) | `backend/src/xrpl/payments.ts`, `vault.ts`, `tokens.ts`; scripts setup-issuer, setup-vault |
| Trust lines | Vault trust line to RLUSD issuer; LPs trust line to Vault for vRLUSD |
| Payments | All RLUSD/vRLUSD transfers |
| XLS-20 NFTs (coverage token) | `backend/src/xrpl/tokens.ts` — mint on bind, burn on resolve |
| Escrows | `backend/src/xrpl/escrows.ts` (available for TokenEscrow when amendment enabled) |
| Batch transactions | Not used in MVP; can be added for bind (Payment + NFT mint) and payout (EscrowFinish + Burn) |

## Risk notes

- **Reserves:** Each trust line/escrow/NFT costs reserve (e.g. 2 XRP on mainnet). Warn users in UI.
- **Secrets:** Never commit or log `VAULT_ACCOUNT_SEED`, `COVERAGE_NFT_ISSUER_SEED`, or any account seeds.
- **Partial payments:** When crediting incoming RLUSD, use `meta.delivered_amount`, not `Amount`.
- **TokenEscrow:** If the network does not have the TokenEscrow amendment, premium/claim are handled via backend state and Payments only.

## XRPL skill alignment

This implementation follows the [XRPL development skill](https://github.com/XRPL-Commons/xrpl-training-2026-january) and best practices:

- **Network:** Testnet default (`wss://s.altnet.rippletest.net:51233`), no mainnet in dev.
- **Transactions:** `autofill()` for Fee, Sequence, `LastLedgerSequence`; `submitAndWait()` so we only return after validation (not just submission).
- **Amounts:** XRP via `xrpToDrops()`; issued currency as string values (no float). Fee cap via `maxFeeXRP: '0.01'` where applicable.
- **Security:** Incoming payment handling would use `meta.delivered_amount` (partial-payment safe); secrets only in env; reserves communicated in UI/README.
- **Frontend:** MVP uses simple wallet address input; for production use `xrpl-connect` and delegate signing to the wallet.

## License

MIT.
