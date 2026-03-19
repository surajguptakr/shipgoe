const fs = require('fs')
const path = require('path')
const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const { z } = require('zod')
const { db, initDb } = require('./db')
const { signToken, authRequired } = require('./auth')

const app = express()
const PORT = process.env.PORT || 8081

initDb()

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
  }),
)
app.use(express.json())

const SHIPMENTS_PATH = path.join(__dirname, 'shipments.json')

function readShipments() {
  try {
    const raw = fs.readFileSync(SHIPMENTS_PATH, 'utf8')
    return JSON.parse(raw)
  } catch (err) {
    console.error('Failed to read shipments.json', err)
    return {}
  }
}

function writeShipments(data) {
  fs.writeFileSync(SHIPMENTS_PATH, JSON.stringify(data, null, 2), 'utf8')
}

function buildPositions(baseRoute) {
  const now = Date.now()
  // Simulate last few GPS samples by time.
  return baseRoute.map((p, idx) => ({
    at: new Date(now - (baseRoute.length - idx) * 15000).toISOString(),
    lat: p.lat,
    lng: p.lng,
    accuracyM: 20,
  }))
}

function buildEvents(shipment) {
  const now = Date.now()
  return [
    {
      at: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      code: 'ORDER_PLACED',
      label: 'Order placed',
      location: shipment.from,
    },
    {
      at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      code: 'PICKED_UP',
      label: 'Picked up',
      location: shipment.from,
    },
    {
      at: new Date(now - 60 * 60 * 1000).toISOString(),
      code: 'IN_TRANSIT',
      label: 'In transit',
      location: 'On the way to hub',
    },
  ]
}

const registerSchema = z.object({
  role: z.enum(['customer', 'partner']).default('customer'),
  email: z.string().email().optional(),
  phone: z.string().min(7).max(20).optional(),
  password: z.string().min(6),
})

const loginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(7).max(20).optional(),
  password: z.string().min(1),
})

app.post('/api/auth/register', (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const { role, email, phone, password } = parsed.data

  if (!email && !phone) return res.status(400).json({ error: 'email or phone required' })

  const password_hash = bcrypt.hashSync(password, 10)

  try {
    const stmt = db.prepare(
      `INSERT INTO users (role, email, phone, password_hash)
       VALUES (@role, @email, @phone, @password_hash)`,
    )
    const result = stmt.run({ role, email: email ?? null, phone: phone ?? null, password_hash })

    db.prepare('INSERT OR IGNORE INTO wallets (user_id, balance_npr) VALUES (?, ?)').run(
      result.lastInsertRowid,
      0,
    )

    const token = signToken({ userId: result.lastInsertRowid, role })
    return res.status(201).json({ token })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed'
    if (msg.includes('UNIQUE')) return res.status(409).json({ error: 'User already exists' })
    return res.status(500).json({ error: 'Failed to register' })
  }
})

app.post('/api/auth/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const { email, phone, password } = parsed.data
  if (!email && !phone) return res.status(400).json({ error: 'email or phone required' })

  const user = db
    .prepare(
      `SELECT id, role, email, phone, password_hash
       FROM users
       WHERE (email = @email AND @email IS NOT NULL)
          OR (phone = @phone AND @phone IS NOT NULL)
       LIMIT 1`,
    )
    .get({ email: email ?? null, phone: phone ?? null })

  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = bcrypt.compareSync(password, user.password_hash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

  const token = signToken({ userId: user.id, role: user.role })
  return res.json({ token })
})

app.get('/api/me', authRequired, (req, res) => {
  const user = db
    .prepare('SELECT id, role, email, phone, created_at FROM users WHERE id = ?')
    .get(req.user.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  return res.json({ user })
})

app.get('/api/wallet', authRequired, (req, res) => {
  const row = db.prepare('SELECT balance_npr FROM wallets WHERE user_id = ?').get(req.user.userId)
  return res.json({ balanceNPR: row?.balance_npr ?? 0 })
})

app.post('/api/wallet/topup', authRequired, (req, res) => {
  const schema = z.object({ amountNPR: z.number().int().positive().max(1_000_000) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const { amountNPR } = parsed.data

  db.prepare(
    `INSERT INTO wallets (user_id, balance_npr) VALUES (?, ?)
     ON CONFLICT(user_id) DO UPDATE SET balance_npr = balance_npr + excluded.balance_npr, updated_at = datetime('now')`,
  ).run(req.user.userId, amountNPR)

  const row = db.prepare('SELECT balance_npr FROM wallets WHERE user_id = ?').get(req.user.userId)
  return res.json({ balanceNPR: row.balance_npr })
})

app.post('/api/orders', authRequired, (req, res) => {
  const schema = z.object({
    flow: z.enum(['parcel', 'quick']),
    amountNPR: z.number().int().positive().max(1_000_000),
    paymentTiming: z.enum(['PAY_NOW', 'PAY_ON_DELIVERY']),
    paymentMethod: z.enum(['WALLET', 'CARD', 'UPI', 'COD']),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const { flow, amountNPR, paymentTiming, paymentMethod } = parsed.data

  if (flow === 'quick' && paymentTiming === 'PAY_ON_DELIVERY') {
    return res.status(400).json({ error: 'PAY_ON_DELIVERY not allowed for quick deliveries' })
  }

  if (paymentTiming === 'PAY_ON_DELIVERY' && paymentMethod !== 'COD') {
    return res.status(400).json({ error: 'Pay on delivery requires COD method' })
  }

  if (paymentTiming === 'PAY_NOW' && paymentMethod === 'COD') {
    return res.status(400).json({ error: 'COD requires Pay on delivery timing' })
  }

  if (paymentTiming === 'PAY_NOW' && paymentMethod === 'WALLET') {
    const row = db.prepare('SELECT balance_npr FROM wallets WHERE user_id = ?').get(req.user.userId)
    const bal = row?.balance_npr ?? 0
    if (bal < amountNPR) return res.status(400).json({ error: 'Insufficient wallet balance' })
    db.prepare(
      'UPDATE wallets SET balance_npr = balance_npr - ?, updated_at = datetime(\'now\') WHERE user_id = ?',
    ).run(amountNPR, req.user.userId)
  }

  const status =
    paymentTiming === 'PAY_ON_DELIVERY' ? 'PLACED_COD' : paymentMethod === 'WALLET' ? 'PAID' : 'PENDING_PAYMENT'

  const result = db
    .prepare(
      `INSERT INTO orders (user_id, flow, amount_npr, payment_timing, payment_method, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(req.user.userId, flow, amountNPR, paymentTiming, paymentMethod, status)

  return res.status(201).json({ orderId: result.lastInsertRowid, status })
})

app.get('/api/tracking/shipments/:id', (req, res) => {
  const id = req.params.id

  const store = readShipments()
  const base = store[id] || store.SGE123456789
  if (!base) {
    return res.status(404).json({ error: 'Shipment not found' })
  }
  const positions = buildPositions(base.baseRoute)
  const events = buildEvents(base)

  res.json({
    id,
    from: base.from,
    to: base.to,
    mode: base.mode,
    status: 'IN_TRANSIT',
    eta: base.eta,
    positions,
    events,
  })
})

// Optional: simple write endpoint to add/update shipments in the JSON file.
app.post('/api/tracking/shipments', (req, res) => {
  const body = req.body
  if (!body || !body.id) {
    return res.status(400).json({ error: 'id is required' })
  }
  const store = readShipments()
  store[body.id] = body
  writeShipments(store)
  res.status(201).json({ ok: true, id: body.id })
})

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`Shipgoe backend listening on http://localhost:${PORT}`)
})

