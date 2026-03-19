const path = require('path')
const Database = require('better-sqlite3')

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'shipgoe.sqlite')

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL CHECK (role IN ('customer','partner')),
      email TEXT,
      phone TEXT,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

    CREATE TABLE IF NOT EXISTS wallets (
      user_id INTEGER PRIMARY KEY,
      balance_npr INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      flow TEXT NOT NULL CHECK (flow IN ('parcel','quick')),
      amount_npr INTEGER NOT NULL,
      payment_timing TEXT NOT NULL CHECK (payment_timing IN ('PAY_NOW','PAY_ON_DELIVERY')),
      payment_method TEXT NOT NULL CHECK (payment_method IN ('WALLET','CARD','UPI','COD')),
      status TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `)
}

module.exports = { db, initDb }

