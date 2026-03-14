"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.initDb = initDb;
const sqlite3 = __importStar(require("sqlite3"));
const db = new sqlite3.Database(":memory:");
function getDb() {
    return db;
}
function initDb() {
    return new Promise((resolve, reject) => {
        db.run(`CREATE TABLE IF NOT EXISTS vault_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        total_rlusd TEXT NOT NULL DEFAULT '0',
        total_vrlusd TEXT NOT NULL DEFAULT '0',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`, (err) => {
            if (err)
                return reject(err);
            db.run(`INSERT OR IGNORE INTO vault_state (id, total_rlusd, total_vrlusd) VALUES (1, '0', '0')`, (e2) => {
                if (e2)
                    return reject(e2);
                db.run(`CREATE TABLE IF NOT EXISTS voyages (
                id TEXT PRIMARY KEY,
                route_name TEXT NOT NULL,
                insured_amount TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
              )`, (e3) => {
                    if (e3)
                        return reject(e3);
                    db.run(`CREATE TABLE IF NOT EXISTS policies (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    voyage_id TEXT NOT NULL,
                    owner_address TEXT NOT NULL,
                    premium_amount TEXT NOT NULL,
                    nft_id TEXT,
                    status TEXT NOT NULL DEFAULT 'active',
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY (voyage_id) REFERENCES voyages(id)
                  )`, (e4) => {
                        if (e4)
                            return reject(e4);
                        db.run(`CREATE TABLE IF NOT EXISTS loans (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        borrower_address TEXT NOT NULL,
                        principal TEXT NOT NULL,
                        rate TEXT NOT NULL,
                        due_date TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'pending',
                        created_at TEXT NOT NULL DEFAULT (datetime('now'))
                      )`, (e5) => {
                            if (e5)
                                return reject(e5);
                            resolve();
                        });
                    });
                });
            });
        });
    });
}
//# sourceMappingURL=schema.js.map