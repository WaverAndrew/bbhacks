# AEGIS — Trade Assurance Vault: Complete Guide

A DeFi vault on XRPL Testnet that pools RLUSD liquidity, sells parametric voyage coverage for high-risk shipping corridors, and provides short-term SME credit. Features a Palantir-style command center with maritime tracking and disaster relief visualization.

---

## Prerequisites

- **Node.js 20+**
- **Three terminals** (scripts, backend, frontend)
- Internet access to XRPL Testnet

---

## 1. One-Time XRPL Testnet Setup

All scripts are in the `scripts/` directory.

```bash
cd scripts
npm install
```

> **If the default testnet URL times out**, prefix commands with:
> ```bash
> export XRPL_NETWORK_URL=wss://testnet.xrpl-labs.com
> export XRPL_CONNECTION_TIMEOUT_MS=30000
> ```

### 1.1 Create RLUSD Issuer

```bash
npx ts-node setup-issuer.ts
```

Save the output:
- **Issuer Address**: `rXXX...`
- **Issuer Seed**: `sEd...` (store securely)

```bash
export RLUSD_ISSUER_ADDRESS=rXXX...
export RLUSD_ISSUER_SEED=sEd...
```

### 1.2 Create Vault Account

```bash
npx ts-node setup-vault.ts
```

Save the output:
- **Vault Address**: `rXXX...`
- **Vault Seed**: `sEd...`

```bash
export VAULT_ACCOUNT_ADDRESS=rXXX...
export VAULT_ACCOUNT_SEED=sEd...
```

### 1.3 Create a Test User Wallet

Generate and fund via the XRPL faucet:

```bash
node -e "const x=require('xrpl');const w=x.Wallet.generate();console.log('Seed:',w.seed);console.log('Address:',w.address);"
```

Fund it:

```bash
node -e "
const xrpl=require('xrpl');
(async()=>{
  const c=new xrpl.Client(process.env.XRPL_NETWORK_URL||'wss://testnet.xrpl-labs.com',{connectionTimeout:30000});
  await c.connect();
  const w=xrpl.Wallet.fromSeed('YOUR_TEST_SEED');
  await c.fundWallet(w);
  console.log('Funded',w.address);
  await c.disconnect();
})();
"
```

### 1.4 Set Up Trust Lines for Test User

The test user needs two trust lines:

**RLUSD trust line** (to receive RLS tokens):
```bash
export RECIPIENT_SEED=sEdXXX...   # your test user seed
npx ts-node setup-trust.ts
```

**vRLUSD trust line** (to receive VRL share tokens from LP deposits):
```bash
npx ts-node setup-vault-trust.ts
```

### 1.5 Issue RLUSD to Test User

```bash
npx ts-node issue-rlusd.ts rTestUserAddress 5000
```

### 1.6 Issue RLUSD to Vault (for payouts)

```bash
npx ts-node issue-rlusd.ts $VAULT_ACCOUNT_ADDRESS 50000
```

### Setup Summary

After these steps you have:

| Account | Has | Purpose |
|---------|-----|---------|
| Issuer | DefaultRipple flag | Issues RLS tokens |
| Vault | RLS trust line, funded with RLUSD | Holds pool liquidity, pays claims |
| Test User | XRP + 5000 RLS + VRL trust line | Acts as LP, exporter, or borrower |

---

## 2. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
XRPL_NETWORK_URL=wss://testnet.xrpl-labs.com
XRPL_CONNECTION_TIMEOUT_MS=30000
RLUSD_ISSUER_ADDRESS=rXXX...
RLUSD_CURRENCY=RLS
VAULT_ACCOUNT_ADDRESS=rXXX...
VAULT_ACCOUNT_SEED=sEdXXX...
COVERAGE_NFT_ISSUER_SEED=sEdXXX...   # can be same as VAULT_ACCOUNT_SEED
PORT=4000
```

Start:

```bash
npm run dev
```

Verify:

```bash
curl http://localhost:4000/health
# → {"status":"ok"}
```

---

## 3. Frontend Setup

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
npm run dev
```

Open **http://localhost:3000**

---

## 4. Using the Dashboard

### 4.1 Command Center (Home Page)

The main page is a Palantir-style command center with two modes:

#### Maritime Mode (Default)
- **Left sidebar**: Lists all tracked vessels in the Strait of Hormuz corridor
- **Center**: Dark-themed map with ship positions, heading arrows, and route lines
- **Right panel**: Click any ship to see vessel intel, cargo, route waypoints, and **insurance coverage details**
- **Top overlays**: Active vessels count, incidents, total insured value, premiums collected
- **Bottom left**: Live vault TVL from the XRPL backend

**How to use:**
1. Click any ship triangle on the map or in the left sidebar
2. The route polyline appears — dashed for the planned route, solid for traveled portion
3. The right panel shows the ship's insurance status (active, claim_paid, etc.)
4. Green dots = origin, red dots = destination, cyan dots = waypoints

#### Disaster Relief Mode
- Toggle **"Disaster Relief"** in the top bar
- **Map**: Shows San Juan, Puerto Rico with hurricane damage zones (colored circles by severity)
- **Properties**: Diamond markers colored by damage level (green=none → red=destroyed)
- **Right panel**: Click a property to see damage assessment with a visual damage bar, insurance coverage, and claim status

**How to use:**
1. Switch to Disaster Relief mode
2. Red/orange zones show the hurricane impact areas
3. Click any property marker to see the damage percentage, insured amount, and whether a claim has been paid
4. Small colored dots on markers indicate: green = claim paid, amber = claim pending

### 4.2 Navigation Links

The top-right corner has quick links to the functional pages:
- **LP Vault** → Liquidity Provider deposit/withdraw
- **Exporter** → Purchase coverage, view policies
- **Oracle** → Admin incident simulator

---

## 5. Full E2E Workflow

### 5.1 LP Deposit (Liquidity Provider)

1. Click **LP Vault** in the top bar (or go to `/lp`)
2. Enter your test wallet address (the one with 5000 RLS)
3. Metrics panel shows your RLUSD and vRLUSD balances
4. In **Deposit**, enter an amount (e.g. `1000`)
5. Click **Mint vRLUSD**
6. Backend sends vRLUSD to your wallet → you see a tx hash
7. Metrics update to show your new vRLUSD balance

### 5.2 Purchase Coverage (Exporter)

1. Click **Exporter** in the top bar (or go to `/exporter`)
2. Enter your wallet address
3. Fill out the coverage form:
   - Voyage ID: `V-HMZ-100`
   - Route: `Hormuz — Mumbai`
   - Insured Amount: `10000`
   - Start/End dates
4. Click **Get Quote** → premium is 2% = `200.00 RLUSD`
5. Click **Confirm & Mint NFT**
6. Backend creates the voyage, mints a coverage NFT on XRPL, records the policy
7. You see the tx hash and NFT ID
8. Policy appears in "Your Policies" with status `active`

### 5.3 Oracle Resolution (Admin)

1. Click **Oracle** in the top bar (or go to `/admin`)
2. The voyages table shows all registered voyages
3. Select a voyage with status `active`
4. **Mark Incident**: Vault pays the insured amount in RLUSD to the policy owner, burns the NFT
5. **No Incident**: Burns the NFT, premium stays in the vault as profit for LPs

### 5.4 LP Withdraw

1. Go back to `/lp`
2. In **Withdraw**, enter a vRLUSD amount
3. Click **Withdraw** → backend sends RLUSD from vault to your wallet

### 5.5 Loan Flow (API only)

```bash
# Apply for a loan
curl -X POST http://localhost:4000/loan/apply \
  -H "Content-Type: application/json" \
  -d '{"borrowerAddress":"rTestAddress","principal":"500","tenorDays":30}'

# Draw the loan (disburse from vault)
curl -X POST http://localhost:4000/loan/draw \
  -H "Content-Type: application/json" \
  -d '{"loanId":1}'

# Repay (mark as repaid — borrower sends RLUSD to vault separately)
curl -X POST http://localhost:4000/loan/repay \
  -H "Content-Type: application/json" \
  -d '{"loanId":1}'

# List loans
curl http://localhost:4000/loan/list?borrower=rTestAddress
```

---

## 6. API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/lp/vault?wallet=rXXX` | Vault metrics + user balances |
| POST | `/lp/deposit` | Mint vRLUSD (body: `{lpAddress, amount}`) |
| POST | `/lp/withdraw` | Burn vRLUSD, get RLUSD (body: `{lpAddress, amount}`) |
| POST | `/coverage/quote` | Get premium quote (body: `{insuredAmount, startDate, endDate}`) |
| POST | `/coverage/bind` | Bind coverage, mint NFT (body: `{voyageId, routeName, insuredAmount, startDate, endDate, premiumAmount, ownerAddress}`) |
| GET | `/coverage/policies?owner=rXXX` | List policies |
| GET | `/oracle/voyages` | List all voyages |
| POST | `/oracle/voyages/:id/incident` | Pay claim + burn NFT |
| POST | `/oracle/voyages/:id/no-incident` | Burn NFT, keep premium |
| POST | `/loan/apply` | Apply for loan (body: `{borrowerAddress, principal, tenorDays}`) |
| POST | `/loan/draw` | Disburse loan (body: `{loanId}`) |
| POST | `/loan/repay` | Mark repaid (body: `{loanId}`) |
| GET | `/loan/list?borrower=rXXX` | List loans |

---

## 7. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ Command  │  │ LP Vault │  │ Exporter │  │ Oracle │  │
│  │ Center   │  │ Page     │  │ Page     │  │ Page   │  │
│  │ (Map +   │  └────┬─────┘  └────┬─────┘  └───┬────┘  │
│  │  Detail)  │       │             │            │        │
│  └──────────┘       └──────┬──────┘            │        │
│                            │                   │        │
│                    ┌───────▼───────┐           │        │
│                    │  API Client   │◄──────────┘        │
│                    │  (api.ts)     │                     │
│                    └───────┬───────┘                     │
└────────────────────────────┼────────────────────────────┘
                             │ HTTP (port 4000)
┌────────────────────────────▼────────────────────────────┐
│                   BACKEND (Express)                      │
│  ┌──────┐  ┌──────────┐  ┌────────┐  ┌──────┐          │
│  │ /lp  │  │/coverage  │  │/oracle │  │/loan │          │
│  └──┬───┘  └────┬──────┘  └───┬────┘  └──┬───┘          │
│     │           │              │          │              │
│  ┌──▼───────────▼──────────────▼──────────▼──┐          │
│  │         XRPL Module Layer                  │          │
│  │  payments · tokens · vault · accounts      │          │
│  └──────────────┬────────────────────────────┘          │
│                 │                                        │
│  ┌──────────────▼──────────┐  ┌────────────────┐        │
│  │  xrpl.js Client         │  │  SQLite (memory)│        │
│  │  (testnet WebSocket)    │  │  vault_state    │        │
│  └──────────────┬──────────┘  │  voyages        │        │
│                 │              │  policies       │        │
│                 │              │  loans          │        │
│                 ▼              └────────────────┘        │
│         XRPL Testnet                                     │
│  (Payments, Trust Lines, NFTs)                           │
└─────────────────────────────────────────────────────────┘
```

---

## 8. XRPL Features Used

| Feature | Where | Purpose |
|---------|-------|---------|
| Issued Currencies (RLS, VRL) | Payments, vault | RLUSD pool + LP share tokens |
| Trust Lines | Setup scripts | Enable token transfers |
| XLS-20 NFTs | Coverage bind/resolve | Coverage token lifecycle |
| Account Set (DefaultRipple) | Issuer setup | Allow token rippling |
| autofill + submitAndWait | All transactions | Reliable submission with fee protection |
| account_lines / account_info | Vault, balances | Query on-chain state |

---

## 9. Troubleshooting

| Problem | Solution |
|---------|----------|
| `connect() timed out` | Set `XRPL_NETWORK_URL=wss://testnet.xrpl-labs.com` and `XRPL_CONNECTION_TIMEOUT_MS=30000` |
| `Vault not configured` | Check `VAULT_ACCOUNT_ADDRESS` and `VAULT_ACCOUNT_SEED` in `backend/.env` |
| `COVERAGE_NFT_ISSUER_SEED not set` | Add it to `.env` (can reuse `VAULT_ACCOUNT_SEED`) |
| `tecNO_LINE` / trust line error | Run `setup-trust.ts` (for RLS) or `setup-vault-trust.ts` (for VRL) for the recipient |
| `Unsupported Currency` | Currency codes must be 3 ASCII chars. We use `RLS` and `VRL` |
| Insufficient XRP | Each trust line reserves ~2 XRP. Fund via faucet |
| `engine_result: undefined` | Not an error — xrpl.js v4 moved this field. Check `meta.TransactionResult` |
| Backend `.env` not loading | Ensure `dotenv` is installed (`npm install dotenv`) |
| Frontend shows 0 balances | Backend must be running with correct `.env`. Check CORS and port |
| Map not rendering | Leaflet requires client-side rendering. Hard refresh if blank |

---

## 10. Quick Smoke Test

With backend running on port 4000:

```bash
# Health
curl -s http://localhost:4000/health | jq .

# Vault state
curl -s http://localhost:4000/lp/vault | jq .

# Coverage quote
curl -s -X POST http://localhost:4000/coverage/quote \
  -H "Content-Type: application/json" \
  -d '{"insuredAmount":"10000","startDate":"2026-04-01","endDate":"2026-05-01"}' | jq .

# Voyages
curl -s http://localhost:4000/oracle/voyages | jq .
```

Or run:
```bash
./scripts/smoke-test-api.sh
```
