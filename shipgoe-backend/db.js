const path = require('path')
const Database = require('better-sqlite3')

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'shipgoe.sqlite')

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

function columnExists(table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all()
  return cols.some((c) => c.name === column)
}

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

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      gateway TEXT NOT NULL CHECK (gateway IN ('ESEWA','KHALTI','CARD','UPI','WALLET')),
      amount_npr INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('INITIATED','PENDING','SUCCESS','FAILED')),
      ref TEXT,
      raw TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );
  `)

  // Lightweight migrations for existing DB files
  if (!columnExists('orders', 'payment_gateway')) {
    db.exec(`ALTER TABLE orders ADD COLUMN payment_gateway TEXT;`)
  }
  if (!columnExists('orders', 'payment_status')) {
    db.exec(`ALTER TABLE orders ADD COLUMN payment_status TEXT;`)
  }
  if (!columnExists('orders', 'payment_ref')) {
    db.exec(`ALTER TABLE orders ADD COLUMN payment_ref TEXT;`)
  }
}

module.exports = { db, initDb }

