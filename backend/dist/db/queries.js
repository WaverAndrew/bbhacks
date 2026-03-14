"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVaultState = getVaultState;
exports.updateVaultState = updateVaultState;
exports.insertVoyage = insertVoyage;
exports.getVoyage = getVoyage;
exports.listVoyages = listVoyages;
exports.updateVoyageStatus = updateVoyageStatus;
exports.insertPolicy = insertPolicy;
exports.getPolicyByVoyageAndOwner = getPolicyByVoyageAndOwner;
exports.listPolicies = listPolicies;
exports.updatePolicyStatus = updatePolicyStatus;
exports.updatePolicyNftId = updatePolicyNftId;
exports.insertLoan = insertLoan;
exports.getLoan = getLoan;
exports.listLoans = listLoans;
exports.updateLoanStatus = updateLoanStatus;
const schema_1 = require("./schema");
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        (0, schema_1.getDb)().run(sql, params, (err) => (err ? reject(err) : resolve()));
    });
}
function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        (0, schema_1.getDb)().get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });
}
function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        (0, schema_1.getDb)().all(sql, params, (err, rows) => (err ? reject(err) : resolve((rows ?? []))));
    });
}
async function getVaultState() {
    const row = await get("SELECT total_rlusd, total_vrlusd FROM vault_state WHERE id = 1");
    return row ?? { total_rlusd: "0", total_vrlusd: "0" };
}
async function updateVaultState(totalRlusd, totalVrlusd) {
    await run("UPDATE vault_state SET total_rlusd = ?, total_vrlusd = ?, updated_at = datetime('now') WHERE id = 1", [totalRlusd, totalVrlusd]);
}
async function insertVoyage(v) {
    await run("INSERT INTO voyages (id, route_name, insured_amount, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?)", [v.id, v.route_name, v.insured_amount, v.start_date, v.end_date, v.status]);
}
async function getVoyage(id) {
    return get("SELECT * FROM voyages WHERE id = ?", [id]);
}
async function listVoyages(status) {
    if (status) {
        return all("SELECT * FROM voyages WHERE status = ? ORDER BY created_at DESC", [status]);
    }
    return all("SELECT * FROM voyages ORDER BY created_at DESC");
}
async function updateVoyageStatus(id, status) {
    await run("UPDATE voyages SET status = ? WHERE id = ?", [status, id]);
}
async function insertPolicy(p) {
    return new Promise((resolve, reject) => {
        (0, schema_1.getDb)().run("INSERT INTO policies (voyage_id, owner_address, premium_amount, nft_id, status) VALUES (?, ?, ?, ?, ?)", [p.voyage_id, p.owner_address, p.premium_amount, p.nft_id ?? null, p.status], function (err) {
            if (err)
                reject(err);
            else
                resolve(this.lastID ?? 0);
        });
    });
}
async function getPolicyByVoyageAndOwner(voyageId, owner) {
    return get("SELECT * FROM policies WHERE voyage_id = ? AND owner_address = ? AND status = 'active'", [
        voyageId,
        owner,
    ]);
}
async function listPolicies(owner, voyageId) {
    if (owner && voyageId) {
        return all("SELECT * FROM policies WHERE owner_address = ? AND voyage_id = ? ORDER BY created_at DESC", [
            owner,
            voyageId,
        ]);
    }
    if (owner) {
        return all("SELECT * FROM policies WHERE owner_address = ? ORDER BY created_at DESC", [owner]);
    }
    if (voyageId) {
        return all("SELECT * FROM policies WHERE voyage_id = ? ORDER BY created_at DESC", [voyageId]);
    }
    return all("SELECT * FROM policies ORDER BY created_at DESC");
}
async function updatePolicyStatus(id, status) {
    await run("UPDATE policies SET status = ? WHERE id = ?", [status, id]);
}
async function updatePolicyNftId(id, nftId) {
    await run("UPDATE policies SET nft_id = ? WHERE id = ?", [nftId, id]);
}
async function insertLoan(l) {
    return new Promise((resolve, reject) => {
        (0, schema_1.getDb)().run("INSERT INTO loans (borrower_address, principal, rate, due_date, status) VALUES (?, ?, ?, ?, ?)", [l.borrower_address, l.principal, l.rate, l.due_date, l.status], function (err) {
            if (err)
                reject(err);
            else
                resolve(this.lastID ?? 0);
        });
    });
}
async function getLoan(id) {
    return get("SELECT * FROM loans WHERE id = ?", [id]);
}
async function listLoans(borrower) {
    if (borrower) {
        return all("SELECT * FROM loans WHERE borrower_address = ? ORDER BY created_at DESC", [borrower]);
    }
    return all("SELECT * FROM loans ORDER BY created_at DESC");
}
async function updateLoanStatus(id, status) {
    await run("UPDATE loans SET status = ? WHERE id = ?", [status, id]);
}
//# sourceMappingURL=queries.js.map