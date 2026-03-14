import { getDb } from "./schema";

function run(sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, (err) => (err ? reject(err) : resolve()));
  });
}

function get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => (err ? reject(err) : resolve(row as T)));
  });
}

function all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => (err ? reject(err) : resolve((rows ?? []) as T[])));
  });
}

export interface VaultState {
  total_rlusd: string;
  total_vrlusd: string;
}

export async function getVaultState(): Promise<VaultState> {
  const row = await get<VaultState>("SELECT total_rlusd, total_vrlusd FROM vault_state WHERE id = 1");
  return row ?? { total_rlusd: "0", total_vrlusd: "0" };
}

export async function updateVaultState(totalRlusd: string, totalVrlusd: string): Promise<void> {
  await run(
    "UPDATE vault_state SET total_rlusd = ?, total_vrlusd = ?, updated_at = datetime('now') WHERE id = 1",
    [totalRlusd, totalVrlusd]
  );
}

export interface Voyage {
  id: string;
  route_name: string;
  insured_amount: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

export async function insertVoyage(v: Omit<Voyage, "created_at">): Promise<void> {
  await run(
    "INSERT INTO voyages (id, route_name, insured_amount, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?)",
    [v.id, v.route_name, v.insured_amount, v.start_date, v.end_date, v.status]
  );
}

export async function getVoyage(id: string): Promise<Voyage | undefined> {
  return get<Voyage>("SELECT * FROM voyages WHERE id = ?", [id]);
}

export async function listVoyages(status?: string): Promise<Voyage[]> {
  if (status) {
    return all<Voyage>("SELECT * FROM voyages WHERE status = ? ORDER BY created_at DESC", [status]);
  }
  return all<Voyage>("SELECT * FROM voyages ORDER BY created_at DESC");
}

export async function updateVoyageStatus(id: string, status: string): Promise<void> {
  await run("UPDATE voyages SET status = ? WHERE id = ?", [status, id]);
}

export interface Policy {
  id: number;
  voyage_id: string;
  owner_address: string;
  premium_amount: string;
  nft_id: string | null;
  status: string;
  escrow_owner: string | null;
  escrow_sequence: number | null;
  created_at: string;
}

export async function insertPolicy(p: Omit<Policy, "id" | "created_at">): Promise<number> {
  return new Promise((resolve, reject) => {
    getDb().run(
      "INSERT INTO policies (voyage_id, owner_address, premium_amount, nft_id, status, escrow_owner, escrow_sequence) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        p.voyage_id,
        p.owner_address,
        p.premium_amount,
        p.nft_id ?? null,
        p.status,
        p.escrow_owner ?? null,
        p.escrow_sequence ?? null,
      ],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID ?? 0);
      }
    );
  });
}

export async function getPolicyByVoyageAndOwner(voyageId: string, owner: string): Promise<Policy | undefined> {
  return get<Policy>("SELECT * FROM policies WHERE voyage_id = ? AND owner_address = ? AND status = 'active'", [
    voyageId,
    owner,
  ]);
}

export async function listPolicies(owner?: string, voyageId?: string): Promise<Policy[]> {
  if (owner && voyageId) {
    return all<Policy>("SELECT * FROM policies WHERE owner_address = ? AND voyage_id = ? ORDER BY created_at DESC", [
      owner,
      voyageId,
    ]);
  }
  if (owner) {
    return all<Policy>("SELECT * FROM policies WHERE owner_address = ? ORDER BY created_at DESC", [owner]);
  }
  if (voyageId) {
    return all<Policy>("SELECT * FROM policies WHERE voyage_id = ? ORDER BY created_at DESC", [voyageId]);
  }
  return all<Policy>("SELECT * FROM policies ORDER BY created_at DESC");
}

export async function updatePolicyStatus(id: number, status: string): Promise<void> {
  await run("UPDATE policies SET status = ? WHERE id = ?", [status, id]);
}

export async function updatePolicyNftId(id: number, nftId: string): Promise<void> {
  await run("UPDATE policies SET nft_id = ? WHERE id = ?", [nftId, id]);
}

export interface Loan {
  id: number;
  borrower_address: string;
  principal: string;
  rate: string;
  due_date: string;
  status: string;
  created_at: string;
}

export async function insertLoan(l: Omit<Loan, "id" | "created_at">): Promise<number> {
  return new Promise((resolve, reject) => {
    getDb().run(
      "INSERT INTO loans (borrower_address, principal, rate, due_date, status) VALUES (?, ?, ?, ?, ?)",
      [l.borrower_address, l.principal, l.rate, l.due_date, l.status],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID ?? 0);
      }
    );
  });
}

export async function getLoan(id: number): Promise<Loan | undefined> {
  return get<Loan>("SELECT * FROM loans WHERE id = ?", [id]);
}

export async function listLoans(borrower?: string): Promise<Loan[]> {
  if (borrower) {
    return all<Loan>("SELECT * FROM loans WHERE borrower_address = ? ORDER BY created_at DESC", [borrower]);
  }
  return all<Loan>("SELECT * FROM loans ORDER BY created_at DESC");
}

export async function updateLoanStatus(id: number, status: string): Promise<void> {
  await run("UPDATE loans SET status = ? WHERE id = ?", [status, id]);
}
