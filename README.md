# Trade Assurance Vault

**Parametric voyage coverage and liquidity pooling on the XRP Ledger**

A DeFi application on **XRPL Testnet** that pools RLUSD liquidity, sells parametric voyage coverage (with premiums and claims on-ledger), and funds short-term SME credit—all using XRPL-native assets, vaults, NFTs, and escrow.

---

## Screenshots

*Add screenshots of the app below. Suggested paths: `docs/screenshots/` or root `screenshots/`.*

### Landing

<!-- ![Landing](screenshots/landing.png) -->

### LP Dashboard — Deposit & Withdraw

<!-- ![LP Dashboard](screenshots/lp-dashboard.png) -->

### Exporter — Quote & Bind Coverage

<!-- ![Exporter](screenshots/exporter.png) -->

### Admin — Oracle (Incident / No Incident)

<!-- ![Admin Oracle](screenshots/admin-oracle.png) -->

---

## Problem & Solution

High-risk trade and shipping corridors are expensive or uninsurable for many SMEs. This project uses XRPL to:

- **Pool RLUSD** in a single-asset vault; LPs receive vault-issued vRLUSD.
- **Sell parametric coverage** per voyage: premium flows to the vault (or is locked in XRP escrow); each policy is represented by an XLS-20 NFT; claims are paid in RLUSD from the vault.
- **Resolve via oracle**: incident → RLUSD payout from vault + release of escrowed XRP to policy owner; no incident → coverage NFT burned, escrowed XRP returned to vault.
- **Disburse short-term RLUSD loans** from the same vault.

---

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
│  RLUSD issuer │ Vault (holds RLUSD, issues vRLUSD) │ Escrows     │
│  Coverage NFT issuer │ Payments, Trust lines, NFTs               │
└─────────────────────────────────────────────────────────────────┘
```

---

## XRPL Implementation

All of the following are implemented on XRPL (Testnet) and used in the app.

| Feature | Implementation |
|--------|----------------|
| **Issued currencies (RLUSD, vRLUSD)** | Trust lines and **Payment** transactions for all RLUSD/vRLUSD flows. Vault holds RLUSD and issues vRLUSD; LPs deposit/withdraw via Payments. `backend/src/xrpl/payments.ts`, `vault.ts`, `tokens.ts`; scripts `setup-issuer`, `setup-vault`. |
| **Trust lines** | Vault trust line to RLUSD issuer; LPs trust lines to vault for vRLUSD. Enforced before mint/withdraw. |
| **Single-asset vault** | Vault account holds RLUSD and mints vRLUSD (Payment from vault to LP). TVL read via **account_lines** (`ledger_index: 'validated'`). `backend/src/xrpl/vault.ts`. |
| **XLS-20 NFTs (coverage token)** | **NFTokenMint** on bind (policy created); **NFTokenBurn** on resolve. Flags `tfTransferable \| tfBurnable`, metadata in URI. `backend/src/xrpl/tokens.ts`. |
| **Smart escrow** | **EscrowCreate** locks XRP until voyage end (Destination = policy owner, FinishAfter/CancelAfter from voyage `endDate`). **EscrowFinish** on incident (XRP to policy owner); **EscrowCancel** on no-incident (XRP back to vault). `backend/src/xrpl/escrows.ts`; used in coverage bind (optional `escrowAmountDrops`) and oracle resolve. |
| **Account & ledger queries** | **account_info**, **account_lines**, **account_objects** with `ledger_index: 'validated'`. `backend/src/xrpl/accounts.ts`. |
| **Transaction handling** | `autofill()` for Fee, Sequence, LastLedgerSequence; `submitAndWait()` for validation; string amounts only; `maxFeeXRP` on client. Incoming payment handling uses `meta.delivered_amount` for partial-payment safety. |

---

## Repo structure

- **`backend/`** — Express API, XRPL module (client, payments, vault, tokens, escrows, accounts), SQLite (voyages, policies, loans, vault_state).
- **`frontend/`** — Next.js: landing, LP (deposit/withdraw, vault metrics), Exporter (quote, bind coverage, policies), Admin (oracle: incident / no-incident).
- **`scripts/`** — XRPL Testnet setup: create/fund RLUSD issuer, create/fund vault and trust line, fund addresses via faucet.

---

## Prerequisites

- Node.js 20+
- XRPL Testnet (or Devnet) access

---

## Environment

**Backend** (`backend/.env` or env vars):

- `XRPL_NETWORK_URL` — e.g. `wss://s.altnet.rippletest.net:51233`
- `RLUSD_ISSUER_ADDRESS` — RLUSD issuer (from scripts)
- `RLUSD_CURRENCY` — e.g. `RLS`
- `VAULT_ACCOUNT_ADDRESS` — Vault account
- `VAULT_ACCOUNT_SEED` — Vault secret (minting vRLUSD, sending RLUSD, creating/finishing/cancelling escrows)
- `COVERAGE_NFT_ISSUER_SEED` — Account that mints/burns coverage NFTs
- `PORT` — API port (default `4000`)

**Frontend** (`frontend/.env.local`):

- `NEXT_PUBLIC_API_URL` — Backend URL (e.g. `http://localhost:4000`)

**Scripts:** same `XRPL_NETWORK_URL`, `RLUSD_ISSUER_ADDRESS`; optionally `RLUSD_ISSUER_SEED`, `VAULT_SEED`.

---

## Run instructions

### 1. One-time XRPL setup

```bash
cd scripts
npm install
npx ts-node setup-issuer.ts
# Set RLUSD_ISSUER_ADDRESS (and optionally RLUSD_ISSUER_SEED), then:
npx ts-node setup-vault.ts
# Save VAULT_ACCOUNT_ADDRESS and VAULT_ACCOUNT_SEED; create/fund coverage NFT issuer, set COVERAGE_NFT_ISSUER_SEED in backend
npx ts-node fund-faucet.ts <address1> <address2>
```

### 2. Backend

```bash
cd backend
npm install
# Copy .env.example to .env and set XRPL/vault vars
npm run dev
```

Backend listens on **http://localhost:4000**.

### 3. Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
npm run dev
```

Open **http://localhost:3000**.

---

## Testing

- **Health:** `curl -s http://localhost:4000/health`
- **Vault:** `curl -s http://localhost:4000/lp/vault`
- **End-to-end:** One-time XRPL setup, then backend + frontend: LP deposit → Exporter bind coverage (with or without `escrowAmountDrops`) → Admin oracle (incident or no-incident).

See **[TESTING.md](TESTING.md)** for the full guide.

---

## Demo flow

1. **LP** — Enter wallet (with RLUSD and vRLUSD trust line to vault). Send RLUSD to vault, then “Mint vRLUSD”; backend mints vRLUSD to you. Withdraw by returning vRLUSD to vault to receive RLUSD.
2. **Exporter** — Create voyage (ID, route, insured amount, dates). Get quote, confirm coverage. Backend creates voyage, mints coverage NFT, records policy. Optionally send XRP to vault and pass `escrowAmountDrops` in bind to lock premium in escrow until voyage end.
3. **Oracle** — In Admin, select voyage and “Mark Incident” or “Mark No Incident”. Incident: RLUSD payout from vault to policy owner, escrowed XRP released to policy owner (if any), coverage NFT burned. No incident: coverage NFT burned, escrowed XRP returned to vault (if any).

---

## Security & reserves

- **Reserves:** Trust lines, escrows, and NFTs consume reserve (e.g. 2 XRP on mainnet); consider this in UX.
- **Secrets:** Keep `VAULT_ACCOUNT_SEED`, `COVERAGE_NFT_ISSUER_SEED`, and all seeds in environment only; never commit or log them.
- **Partial payments:** Use `meta.delivered_amount` when processing incoming payments.

---

## License

MIT.
