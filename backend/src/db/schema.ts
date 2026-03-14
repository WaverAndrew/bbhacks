import * as sqlite3 from "sqlite3";

const db = new sqlite3.Database(":memory:");

export function getDb(): sqlite3.Database {
  return db;
}

export function initDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS vault_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        total_rlusd TEXT NOT NULL DEFAULT '0',
        total_vrlusd TEXT NOT NULL DEFAULT '0',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      (err) => {
        if (err) return reject(err);
        db.run(
          `INSERT OR IGNORE INTO vault_state (id, total_rlusd, total_vrlusd) VALUES (1, '0', '0')`,
          (e2) => {
            if (e2) return reject(e2);
            db.run(
              `CREATE TABLE IF NOT EXISTS voyages (
                id TEXT PRIMARY KEY,
                route_name TEXT NOT NULL,
                insured_amount TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
              )`,
              (e3) => {
                if (e3) return reject(e3);
                db.run(
                  `CREATE TABLE IF NOT EXISTS policies (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    voyage_id TEXT NOT NULL,
                    owner_address TEXT NOT NULL,
                    premium_amount TEXT NOT NULL,
                    nft_id TEXT,
                    status TEXT NOT NULL DEFAULT 'active',
                    escrow_owner TEXT,
                    escrow_sequence INTEGER,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY (voyage_id) REFERENCES voyages(id)
                  )`,
                  (e4) => {
                    if (e4) return reject(e4);
                    db.run(
                      `CREATE TABLE IF NOT EXISTS loans (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        borrower_address TEXT NOT NULL,
                        principal TEXT NOT NULL,
                        rate TEXT NOT NULL,
                        due_date TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'pending',
                        created_at TEXT NOT NULL DEFAULT (datetime('now'))
                      )`,
                      (e5) => {
                        if (e5) return reject(e5);
                        resolve();
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });
}
