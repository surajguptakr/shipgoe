const { Pool } = require('pg')

if (!process.env.DATABASE_URL) {
  // Keep a clear error early in production; local dev should set DATABASE_URL.
  console.warn('DATABASE_URL is not set. Backend DB calls will fail until configured.')
}

const databaseUrl = process.env.DATABASE_URL || ''
const needsSsl =
  process.env.PGSSLMODE === 'require' ||
  /sslmode=require/i.test(databaseUrl) ||
  /ssl=true/i.test(databaseUrl) ||
  process.env.NODE_ENV === 'production'

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
})

async function initDb() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        role TEXT NOT NULL CHECK (role IN ('customer','partner')),
        email TEXT UNIQUE,
        phone TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS wallets (
        user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        balance_npr INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS orders (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        flow TEXT NOT NULL CHECK (flow IN ('parcel','quick')),
        amount_npr INTEGER NOT NULL,
        payment_timing TEXT NOT NULL CHECK (payment_timing IN ('PAY_NOW','PAY_ON_DELIVERY')),
        payment_method TEXT NOT NULL CHECK (payment_method IN ('WALLET','CARD','UPI','COD')),
        status TEXT NOT NULL,
        payment_gateway TEXT,
        payment_status TEXT,
        payment_ref TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS payments (
        id BIGSERIAL PRIMARY KEY,
        order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        gateway TEXT NOT NULL CHECK (gateway IN ('ESEWA','KHALTI','CARD','UPI','WALLET')),
        amount_npr INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('INITIATED','PENDING','SUCCESS','FAILED')),
        ref TEXT,
        raw JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_payments_ref ON payments(ref);
      CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at DESC);
    `)
  } finally {
    client.release()
  }
}

module.exports = { pool, initDb }

