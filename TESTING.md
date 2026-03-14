# Testing Trade Assurance Vault

This guide covers **manual end-to-end testing** on XRPL Testnet and a quick **API smoke test**.

## Prerequisites

- **Node.js 20+**
- **Two terminals** (one for backend, one for frontend)
- **Env file** for backend with real Testnet credentials (see below)

---

## 1. One-time XRPL setup

Run from repo root. Use **Testnet** only.

### 1.1 Create and fund RLUSD issuer

```bash
cd scripts
npm install
npx ts-node setup-issuer.ts
```

- Copy the printed **issuer address** and **seed** (if new).
- Set in your environment:
  - `export RLUSD_ISSUER_ADDRESS=rXXX...`
  - `export RLUSD_ISSUER_SEED=sEd...`   # optional if you’ll only run scripts that need the address

### 1.2 Create and fund Vault

```bash
export RLUSD_ISSUER_ADDRESS=rXXX...   # from step 1.1
npx ts-node setup-vault.ts
```

- Copy the printed **Vault address** and **seed** (if new).
- Set:
  - `export VAULT_ACCOUNT_ADDRESS=rXXX...`
  - `export VAULT_ACCOUNT_SEED=sEd...`

### 1.3 Fund test wallets with XRP

Use the faucet script to send XRP to any addresses you’ll use as LP or Exporter:

```bash
npx ts-node fund-faucet.ts rYourLPAddress rYourExporterAddress
```

### 1.4 Give a test wallet RLUSD (optional but recommended)

To deposit or pay premiums, a wallet needs **RLUSD** (test currency `RLS` from the issuer).

**Option A – Use the helper scripts**

1. **Create trust line** from the wallet that will receive RLUSD to the RLUSD issuer:

   ```bash
   export RLUSD_ISSUER_ADDRESS=rXXX...
   export RLUSD_CURRENCY=RLS
   export RECIPIENT_SEED=sEd...   # the wallet that should receive RLUSD
   npx ts-node setup-trust.ts
   ```

2. **Issue RLUSD** from issuer to that address:

   ```bash
   export RLUSD_ISSUER_SEED=sEd...
   npx ts-node issue-rlusd.ts rRecipientAddress 1000
   ```

**Option B – Manual**

- Have the recipient set a trust line to `RLUSD_ISSUER_ADDRESS` for currency `RLS`.
- From the issuer account, send a Payment of `RLS` to the recipient.

### 1.5 Let an LP wallet receive vRLUSD (for LP deposit)

Before the backend can mint vRLUSD to an LP, that LP must have a **trust line to the Vault** for **VRLS**:

```bash
export VAULT_ACCOUNT_ADDRESS=rXXX...
export RECIPIENT_SEED=sEd...   # the LP wallet seed
npx ts-node setup-vault-trust.ts
```

---

## 2. Backend env and run

Create `backend/.env` (or export in the shell):

```env
XRPL_NETWORK_URL=wss://s.altnet.rippletest.net:51233
RLUSD_ISSUER_ADDRESS=rXXX...
RLUSD_CURRENCY=RLS
VAULT_ACCOUNT_ADDRESS=rXXX...
VAULT_ACCOUNT_SEED=sEd...
COVERAGE_NFT_ISSUER_SEED=sEd...   # can be same as VAULT_ACCOUNT_SEED for demo
PORT=4000
```

Start the backend:

```bash
cd backend
npm install
npm run dev
```

You should see: `Backend listening on http://localhost:4000`.

---

## 3. API smoke test (no UI)

With the backend running:

```bash
# Health
curl -s http://localhost:4000/health
# Expect: {"status":"ok"}

# Vault (no wallet)
curl -s http://localhost:4000/lp/vault
# Expect: JSON with totalRlusd, totalVrlusd, etc.

# Coverage quote
curl -s -X POST http://localhost:4000/coverage/quote \
  -H "Content-Type: application/json" \
  -d '{"insuredAmount":"1000","startDate":"2025-01-01","endDate":"2025-02-01"}'
# Expect: {"premium":"20",...}

# Oracle voyages list
curl -s http://localhost:4000/oracle/voyages
# Expect: {"voyages":[]} or list of voyages
```

If these return JSON and no 5xx errors, the API is up and wired correctly.

---

## 4. Frontend and full E2E in the UI

### 4.1 Start frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
npm run dev
```

Open **http://localhost:3000**.

### 4.2 LP flow (deposit → vRLUSD)

1. Go to **Liquidity Provider**.
2. Use an **LP wallet** that:
   - Has XRP (from faucet).
   - Has run **setup-vault-trust.ts** (trust line to Vault for **VRLS**) so it can receive vRLUSD.
   - For a full flow: has **RLUSD** (run **setup-trust.ts** + **issue-rlusd.ts**) and has sent that RLUSD to the Vault address (the backend then mints vRLUSD when you click deposit).
3. Enter the LP **wallet address** and an **amount**, then click **Mint vRLUSD**.
4. Check the response for a **tx hash** and that vault metrics show your vRLUSD balance.

### 4.3 Exporter flow (quote → bind coverage)

1. Go to **Exporter / Shipowner**.
2. Enter the **exporter wallet address**.
3. Fill:
   - Voyage ID (e.g. `V001`)
   - Route name (e.g. `Hormuz–Mumbai`)
   - Insured amount (e.g. `1000`)
   - Start/end dates
4. Click **Get quote** → note the premium.
5. (In a full flow, the exporter would send the premium in RLUSD to the Vault; for a minimal test you can still bind and the backend will create the voyage and mint the coverage NFT.)
6. Click **Confirm coverage**.
7. Check for **tx hash** and that the policy appears in **Your policies** with status **Active**.

### 4.4 Oracle flow (incident / no incident)

1. Go to **Admin / Oracle**.
2. In the dropdown, select the **voyage** you created (e.g. `V001`).
3. Click **Mark Incident**  
   - Backend should pay out RLUSD from the Vault to the policy owner and burn the coverage NFT.
4. Or click **Mark No Incident**  
   - Backend should burn the coverage NFT and leave premium in the Vault.

Check the result message and **tx hashes** on the page.

---

## 5. Quick checklist

| Step | What to check |
|------|----------------|
| Scripts | Issuer and Vault created and funded; addresses/seeds in env |
| Backend | `curl http://localhost:4000/health` → `{"status":"ok"}` |
| Frontend | http://localhost:3000 loads; LP / Exporter / Admin links work |
| LP | Deposit returns tx hash; vault stats show your vRLUSD (and TVL if applicable) |
| Exporter | Quote returns premium; Bind returns tx hash; policy appears with status Active |
| Oracle | Incident or No Incident returns success and payout/burn tx hash |

---

## 6. Troubleshooting

- **“Vault not configured”**  
  Set `VAULT_ACCOUNT_ADDRESS` and `VAULT_ACCOUNT_SEED` in backend env.

- **“COVERAGE_NFT_ISSUER_SEED not set”**  
  Set it in backend env (can use the same value as `VAULT_ACCOUNT_SEED` for demo).

- **Trust line / tecNO_LINE**  
  The receiving account must have a trust line to the issuer (for RLS) or to the Vault (for VRLS) before it can receive that currency.

- **Insufficient XRP**  
  Each new trust line and ledger object reserves XRP (~2 XRP per object on mainnet; testnet may differ). Fund the account with the faucet and ensure enough for reserves + fees.

- **Backend fails to connect to XRPL**  
  Confirm `XRPL_NETWORK_URL` is Testnet (e.g. `wss://s.altnet.rippletest.net:51233`) and the network is reachable.

---

## 7. Optional: automated API smoke script

From repo root, with backend running:

```bash
./scripts/smoke-test-api.sh
```

Or run the same `curl` commands from section 3 manually.
