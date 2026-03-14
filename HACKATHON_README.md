# Trade Assurance Vault — XRPL Hackathon Submission

A DeFi application on **XRPL Testnet** that addresses real-world trade and shipping risk: it pools **RLUSD** liquidity in a single-asset vault, sells parametric voyage coverage (with coverage represented on-ledger), and disburses short-term **RLUSD** credit from the same vault. The project is built to showcase a multi-feature integration of XRPL primitives—issued currencies, Single Asset Vault pattern, XLS-20 NFTs, and escrow-ready flows—in a single, testable codebase.

---

## Problem & Solution

High-risk trade and shipping corridors are costly or uninsurable for many SMEs. This project demonstrates how XRPL can support:

- **Liquidity pooling** — LPs deposit RLUSD into a vault and receive vault-issued vRLUSD (vault receipt token).
- **Parametric coverage** — Exporters buy voyage-specific coverage; each policy is represented by an XLS-20 NFT; premiums flow into the vault and claims are paid in RLUSD from the vault.
- **Short-term credit** — The same vault can disburse RLUSD loans to borrowers, with repayment back into the vault.

All flows use **XRPL Testnet** and the **RLUSD** stablecoin (issued currency). The vault acts as a single-asset pool that both holds RLUSD and issues vRLUSD, aligning with XRPL’s Single Asset Vault / Lending Protocol concepts.

---

## XRPL Integration — Technical Overview

The application is implemented against **XRPL Testnet** (`wss://s.altnet.rippletest.net:51233`) using **xrpl.js** with the following patterns and transaction types.

### 1. Issued Currencies & Stablecoin (RLUSD)

- **RLUSD** is an issued currency (e.g. `RLS`) from a dedicated issuer account. The vault and all users hold RLUSD via **trust lines** to the issuer.
- **vRLUSD (VRL)** is a second issued currency, with the **vault account** as issuer. LPs hold vRLUSD as vault receipt tokens.
- **Trust lines**: Vault has a trust line to the RLUSD issuer; LPs have trust lines to the vault for vRLUSD (and to the RLUSD issuer for RLUSD).
- **Payments**: All RLUSD and vRLUSD movements use the **Payment** transaction type with `Amount` as `{ currency, issuer, value }`. Amounts are **string** values only (no floats). Implementation: `backend/src/xrpl/payments.ts` (`sendRLUSD`), `backend/src/xrpl/vault.ts` (deposit/withdraw), `backend/src/xrpl/tokens.ts` (`mintVRlusd`).

### 2. Single Asset Vault (Lending Protocol Style)

- A dedicated **vault account** holds RLUSD and issues vRLUSD. This mirrors the Single Asset Vault / Lending Protocol pattern: one asset in (RLUSD), one receipt token out (vRLUSD).
- **Deposit**: LP sends RLUSD to the vault (off-app); backend mints vRLUSD to the LP via a **Payment** from the vault (vRLUSD issuer) to the LP. TVL is derived from **account_lines** (vault’s balance with RLUSD issuer) and local state.
- **Withdraw**: LP sends vRLUSD back to the vault; backend sends RLUSD from the vault to the LP via **Payment**.
- Implementation: `backend/src/xrpl/vault.ts` (vault deposit/withdraw, `getVaultTVL`), `backend/src/routes/lp.ts` (REST API). Vault TVL uses `account_lines` with `ledger_index: 'validated'`.

### 3. XLS-20 NFTs (Coverage Token)

- Each voyage coverage policy is represented by an **XLS-20 NFT** (coverage token). Mint on bind, burn on resolve.
- **NFTokenMint**: On coverage bind, backend mints an NFT with `NFTokenTaxon: 0`, `Flags: 9` (`tfTransferable | tfBurnable`), `TransferFee: 0`, and a hex-encoded URI (policy metadata). Mint is done by a dedicated coverage-NFT issuer account (configurable).
- **NFTokenBurn**: On oracle resolve (incident or no-incident), backend burns the NFT from the issuer account. Policy and voyage status are updated in the app layer.
- NFT ID is read from the transaction result meta (e.g. `meta.nftoken_id` or by scanning `affected_nodes` for `NFTokenPage` changes). Implementation: `backend/src/xrpl/tokens.ts` (`mintCoverageNFT`, `burnCoverageNFT`, `burnCoverageNFTByIssuer`), used by `backend/src/routes/coverage.ts` (bind) and `backend/src/routes/oracle.ts` (incident / no-incident).

### 4. Escrow (Smart Escrow)

- The codebase includes a full **Escrow** integration for time-locked, conditional flows:
  - **EscrowCreate**: `TransactionType: "EscrowCreate"` with `Account`, `Destination`, `Amount` (XRP in drops), optional `FinishAfter`, `CancelAfter`, and `Memos`. Uses **autofill** for `LastLedgerSequence` and **submitAndWait** for validation.
  - **EscrowFinish**: `TransactionType: "EscrowFinish"` with `Owner`, `OfferSequence` to complete the escrow.
- Implementation: `backend/src/xrpl/escrows.ts` (`createEscrow`, `finishEscrow`). The module is structured so token-based escrows can be added using the same submission and validation patterns (TokenEscrow).

### 5. Account & Ledger Queries

- **account_info**: XRP balance and account data; used with `ledger_index: 'validated'`.
- **account_lines**: Trust line balances (RLUSD, vRLUSD) for the vault and users; all requests use `ledger_index: 'validated'`.
- **account_objects**: Available for escrow and other ledger object queries.
- Implementation: `backend/src/xrpl/accounts.ts` (`getBalance`, `getTrustLineBalance`, `hasTrustLine`, `getAccountObjects`). Used by LP flows (trust line checks, TVL) and vault logic.

### 6. Transaction & Client Best Practices

- **Client**: Single shared client, `maxFeeXRP: "0.01"`, configurable `connectionTimeout`. Testnet URL from config (`XRPL_NETWORK_URL`). Implementation: `backend/src/xrpl/client.ts`.
- **All submissions**: `client.autofill(tx)` for Fee, Sequence, and `LastLedgerSequence`; `client.submitAndWait(signed.tx_blob)` so the API returns only after ledger validation.
- **Amounts**: XRP via `xrpToDrops()` where applicable; issued currency always as string `value`. No float arithmetic for money.
- **Incoming payments**: Design uses `meta.delivered_amount` (not `Amount`) for partial-payment safety when processing incoming payments.

### 7. Multi-Purpose Tokens & Batch Readiness

- **Multi-purpose tokens**: RLUSD (stablecoin), vRLUSD (vault receipt), and the coverage NFT (proof of policy) are used together in one app—payments, vault mechanics, and attestation.
- **Batch**: Current flows use single-transaction submissions; the architecture (separate payment, mint, burn, escrow modules) allows combining operations (e.g. Payment + NFTokenMint, or EscrowFinish + NFTokenBurn) into batch transactions when needed.

---

## Alignment With Hackathon Criteria

| Criterion | How This Project Addresses It |
|-----------|-------------------------------|
| **Stablecoin flows (RLUSD)** | All liquidity, premiums, claims, and loans are in RLUSD on XRPL Testnet; vault and users hold RLUSD via trust lines and Payment transactions. |
| **Lending Protocol / Single Asset Vault** | A dedicated vault account holds RLUSD and issues vRLUSD (vault receipt token); deposit/withdraw and TVL are implemented with account_lines and Payments. |
| **Smart escrow** | EscrowCreate and EscrowFinish with optional time and memo are implemented in `backend/src/xrpl/escrows.ts` and ready for time-locked and conditional flows. |
| **Multi-purpose tokens** | RLUSD, vRLUSD, and XLS-20 coverage NFTs are used in one application for pooling, coverage, and attestation. |
| **TokenEscrow** | Escrow module is built for extension to token escrows when the TokenEscrow amendment is enabled; same client and submission patterns. |
| **Multi-feature integration** | One codebase combines: issued currencies, Single Asset Vault, XLS-20 NFTs, escrow, account/ledger APIs, and RLUSD payments for coverage and loans. |

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
│  RLUSD issuer │ Vault (holds RLUSD, issues vRLUSD) │ Escrows    │
│  Coverage NFT issuer │ Payments, Trust lines, NFTs               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Repository Structure

| Path | Description |
|------|-------------|
| `backend/` | Express API, XRPL module (client, payments, vault, tokens, escrows, accounts), SQLite (voyages, policies, loans, vault state). |
| `backend/src/xrpl/` | All XRPL interaction: `client.ts`, `payments.ts`, `vault.ts`, `tokens.ts`, `escrows.ts`, `accounts.ts`. |
| `frontend/` | Next.js app: landing, LP (deposit/withdraw, vault metrics), Exporter (quote, bind coverage, policies), Admin (oracle: incident / no-incident). |
| `scripts/` | Testnet setup: create/fund RLUSD issuer, create/fund vault and trust line, fund addresses via faucet. |

---

## Prerequisites

- Node.js 20+
- XRPL Testnet (or Devnet) access

---

## Environment Configuration

**Backend** (`backend/.env` or environment variables):

| Variable | Description |
|----------|-------------|
| `XRPL_NETWORK_URL` | WebSocket URL (e.g. `wss://s.altnet.rippletest.net:51233`). |
| `RLUSD_ISSUER_ADDRESS` | RLUSD issuer account (from scripts). |
| `RLUSD_CURRENCY` | Currency code (e.g. `RLS`). |
| `VAULT_ACCOUNT_ADDRESS` | Vault account address. |
| `VAULT_ACCOUNT_SEED` | Vault secret (for issuing vRLUSD and sending RLUSD). |
| `COVERAGE_NFT_ISSUER_SEED` | Account that mints and burns coverage NFTs. |
| `PORT` | API port (default `4000`). |

**Frontend** (`frontend/.env.local`):

- `NEXT_PUBLIC_API_URL` — Backend URL (e.g. `http://localhost:4000`).

**Scripts**: Use the same `XRPL_NETWORK_URL`, `RLUSD_ISSUER_ADDRESS`; optionally `RLUSD_ISSUER_SEED`, `VAULT_SEED` for deterministic wallets.

---

## Run Instructions

### 1. One-time XRPL setup

```bash
cd scripts
npm install
# Create and fund RLUSD issuer (save address and seed)
npx ts-node setup-issuer.ts
# Set RLUSD_ISSUER_ADDRESS (and optionally RLUSD_ISSUER_SEED), then:
npx ts-node setup-vault.ts
# Save VAULT_ACCOUNT_ADDRESS and VAULT_ACCOUNT_SEED
# Create/fund coverage NFT issuer account; set COVERAGE_NFT_ISSUER_SEED in backend
# Fund test addresses (e.g. LP, exporter):
npx ts-node fund-faucet.ts <address1> <address2>
```

### 2. Backend

```bash
cd backend
npm install
# Copy .env.example to .env and set XRPL/vault variables. PORT defaults to 4000.
npm run dev
# Or: npm run build && npm start
```

Backend serves at **http://localhost:4000**.

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

- **Health**: `curl -s http://localhost:4000/health`
- **Vault state**: `curl -s http://localhost:4000/lp/vault`
- **End-to-end**: Run backend and frontend, then: LP deposit (RLUSD → vault, receive vRLUSD) → Exporter bind coverage (voyage, premium, coverage NFT minted) → Admin oracle (incident → RLUSD payout + NFT burn; no-incident → NFT burn, premium remains in vault).

See **TESTING.md** for a step-by-step testing guide.

---

## Demo Flow

1. **LP** — Enter wallet address (with RLUSD and vRLUSD trust line to vault). Enter amount and mint vRLUSD (backend mints vRLUSD after RLUSD is sent to the vault). Withdraw by returning vRLUSD to the vault to receive RLUSD.
2. **Exporter** — Create a voyage (ID, route, insured amount, dates). Get quote, confirm coverage; backend creates the voyage, mints the coverage NFT, and records the policy. Premium is sent to the vault in RLUSD.
3. **Oracle** — In Admin, select a voyage and choose “Mark Incident” or “Mark No Incident”. Incident: backend pays RLUSD from the vault to the policy owner and burns the coverage NFT. No incident: backend burns the NFT; premium remains in the vault.

---

## Security & Reserves

- **Reserves**: Trust lines, escrows, and NFTs consume reserve (e.g. 2 XRP on mainnet); consider this in UX and documentation.
- **Secrets**: `VAULT_ACCOUNT_SEED`, `COVERAGE_NFT_ISSUER_SEED`, and any account seeds are loaded from environment only and must not be committed or logged.
- **Partial payments**: When processing incoming payments, the code uses `meta.delivered_amount` for correct amount handling.

---

## License

MIT.

---

## Resources

- [XRPL Developer Resources](https://linktr.ee/rippledevrel)
- [xrpl.js](https://js.xrpl.org/) — JavaScript/TypeScript SDK used for all XRPL calls in this project.
