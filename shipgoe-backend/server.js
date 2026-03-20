const fs = require('fs')
const path = require('path')
const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const { z } = require('zod')
const { pool, initDb } = require('./db')
const { signToken, authRequired } = require('./auth')

const app = express()
const PORT = process.env.PORT || 8081

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

  ;(async () => {
    try {
      const result = await pool.query(
        `INSERT INTO users (role, email, phone, password_hash)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [role, email ?? null, phone ?? null, password_hash],
      )
      const userId = Number(result.rows[0].id)

      await pool.query(
        `INSERT INTO wallets (user_id, balance_npr)
         VALUES ($1, 0)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId],
      )

      const token = signToken({ userId, role })
      return res.status(201).json({ token })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed'
      if (msg.includes('duplicate key')) return res.status(409).json({ error: 'User already exists' })
      return res.status(500).json({ error: 'Failed to register' })
    }
  })()
})

app.post('/api/auth/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const { email, phone, password } = parsed.data
  if (!email && !phone) return res.status(400).json({ error: 'email or phone required' })

  ;(async () => {
    const result = await pool.query(
      `SELECT id, role, email, phone, password_hash
       FROM users
       WHERE ($1::text IS NOT NULL AND email = $1)
          OR ($2::text IS NOT NULL AND phone = $2)
       LIMIT 1`,
      [email ?? null, phone ?? null],
    )
    const user = result.rows[0]
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })
    const ok = bcrypt.compareSync(password, user.password_hash)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

    const token = signToken({ userId: Number(user.id), role: user.role })
    return res.json({ token })
  })().catch(() => res.status(500).json({ error: 'Login failed' }))
})

app.get('/api/me', authRequired, (req, res) => {
  ;(async () => {
    const result = await pool.query(
      'SELECT id, role, email, phone, created_at FROM users WHERE id = $1',
      [req.user.userId],
    )
    const user = result.rows[0]
    if (!user) return res.status(404).json({ error: 'User not found' })
    return res.json({ user })
  })().catch(() => res.status(500).json({ error: 'Failed' }))
})

app.get('/api/wallet', authRequired, (req, res) => {
  ;(async () => {
    const result = await pool.query('SELECT balance_npr FROM wallets WHERE user_id = $1', [
      req.user.userId,
    ])
    const row = result.rows[0]
    return res.json({ balanceNPR: row?.balance_npr ?? 0 })
  })().catch(() => res.status(500).json({ error: 'Failed' }))
})

app.post('/api/wallet/topup', authRequired, (req, res) => {
  const schema = z.object({ amountNPR: z.number().int().positive().max(1_000_000) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const { amountNPR } = parsed.data

  ;(async () => {
    await pool.query(
      `INSERT INTO wallets (user_id, balance_npr)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET balance_npr = wallets.balance_npr + EXCLUDED.balance_npr, updated_at = now()`,
      [req.user.userId, amountNPR],
    )
    const result = await pool.query('SELECT balance_npr FROM wallets WHERE user_id = $1', [
      req.user.userId,
    ])
    return res.json({ balanceNPR: result.rows[0].balance_npr })
  })().catch(() => res.status(500).json({ error: 'Failed' }))
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
    // Handled in transaction below for atomicity
  }

  const status =
    paymentTiming === 'PAY_ON_DELIVERY'
      ? 'PLACED_COD'
      : paymentMethod === 'WALLET'
        ? 'PAID'
        : 'PENDING_PAYMENT'

  ;(async () => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      if (paymentTiming === 'PAY_NOW' && paymentMethod === 'WALLET') {
        const balRes = await client.query('SELECT balance_npr FROM wallets WHERE user_id = $1 FOR UPDATE', [
          req.user.userId,
        ])
        const bal = balRes.rows[0]?.balance_npr ?? 0
        if (bal < amountNPR) {
          await client.query('ROLLBACK')
          return res.status(400).json({ error: 'Insufficient wallet balance' })
        }
        await client.query('UPDATE wallets SET balance_npr = balance_npr - $1, updated_at = now() WHERE user_id = $2', [
          amountNPR,
          req.user.userId,
        ])
      }

      const gateway =
        paymentMethod === 'UPI' ? 'KHALTI' : paymentMethod === 'CARD' ? 'CARD' : paymentMethod
      const paymentStatus =
        paymentMethod === 'WALLET' ? 'SUCCESS' : paymentTiming === 'PAY_ON_DELIVERY' ? 'PENDING' : 'INITIATED'

      const orderRes = await client.query(
        `INSERT INTO orders (user_id, flow, amount_npr, payment_timing, payment_method, status, payment_gateway, payment_status, payment_ref)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id`,
        [req.user.userId, flow, amountNPR, paymentTiming, paymentMethod, status, gateway, paymentStatus, null],
      )
      const orderId = Number(orderRes.rows[0].id)

      if (paymentTiming === 'PAY_NOW' && paymentMethod !== 'WALLET') {
        const ref = `PAY-${orderId}-${Date.now()}`
        const payRes = await client.query(
          `INSERT INTO payments (order_id, gateway, amount_npr, status, ref)
           VALUES ($1,$2,$3,$4,$5)
           RETURNING id`,
          [orderId, gateway, amountNPR, 'INITIATED', ref],
        )
        await client.query('COMMIT')
        return res.status(201).json({
          orderId,
          status,
          payment: { id: Number(payRes.rows[0].id), gateway, status: 'INITIATED', ref },
        })
      }

      await client.query('COMMIT')
      return res.status(201).json({ orderId, status })
    } catch {
      try {
        await pool.query('ROLLBACK')
      } catch {}
      return res.status(500).json({ error: 'Failed to create order' })
    } finally {
      client.release()
    }
  })()
})

// eSewa placeholder initiate + callback
app.post('/api/payments/esewa/initiate', authRequired, (req, res) => {
  const schema = z.object({ orderId: z.number().int().positive() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  ;(async () => {
    const orderRes = await pool.query('SELECT id, amount_npr FROM orders WHERE id = $1 AND user_id = $2', [
      parsed.data.orderId,
      req.user.userId,
    ])
    const order = orderRes.rows[0]
    if (!order) return res.status(404).json({ error: 'Order not found' })

    const ref = `ESEWA-${order.id}-${Date.now()}`
    await pool.query(
      `INSERT INTO payments (order_id, gateway, amount_npr, status, ref)
       VALUES ($1, 'ESEWA', $2, 'INITIATED', $3)`,
      [order.id, order.amount_npr, ref],
    )

    // In real integration you return the payment form params + success/failure URLs
    return res.json({
      gateway: 'ESEWA',
      ref,
      amountNPR: order.amount_npr,
      successUrl: `${process.env.PUBLIC_API_BASE || `http://localhost:${PORT}`}/api/payments/esewa/callback?ref=${encodeURIComponent(ref)}&status=success`,
      failureUrl: `${process.env.PUBLIC_API_BASE || `http://localhost:${PORT}`}/api/payments/esewa/callback?ref=${encodeURIComponent(ref)}&status=failed`,
    })
  })().catch(() => res.status(500).json({ error: 'Failed' }))
})

app.get('/api/payments/esewa/callback', (req, res) => {
  const ref = String(req.query.ref || '')
  const status = String(req.query.status || '')
  if (!ref) return res.status(400).send('Missing ref')

  ;(async () => {
    const payRes = await pool.query('SELECT id, order_id FROM payments WHERE ref = $1 AND gateway = $2', [
      ref,
      'ESEWA',
    ])
    const payment = payRes.rows[0]
    if (!payment) return res.status(404).send('Payment not found')

    const nextStatus = status === 'success' ? 'SUCCESS' : 'FAILED'
    await pool.query(`UPDATE payments SET status = $1, updated_at = now() WHERE id = $2`, [
      nextStatus,
      payment.id,
    ])
    await pool.query(`UPDATE orders SET payment_status = $1, payment_ref = $2 WHERE id = $3`, [
      nextStatus,
      ref,
      payment.order_id,
    ])

    return res.send(`Shipgoe payment ${nextStatus}`)
  })().catch(() => res.status(500).send('Failed'))
})

// Khalti placeholder initiate + verify
app.post('/api/payments/khalti/initiate', authRequired, (req, res) => {
  const schema = z.object({ orderId: z.number().int().positive() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  ;(async () => {
    const orderRes = await pool.query('SELECT id, amount_npr FROM orders WHERE id = $1 AND user_id = $2', [
      parsed.data.orderId,
      req.user.userId,
    ])
    const order = orderRes.rows[0]
    if (!order) return res.status(404).json({ error: 'Order not found' })

    const ref = `KHALTI-${order.id}-${Date.now()}`
    await pool.query(
      `INSERT INTO payments (order_id, gateway, amount_npr, status, ref)
       VALUES ($1, 'KHALTI', $2, 'INITIATED', $3)`,
      [order.id, order.amount_npr, ref],
    )

    return res.json({
      gateway: 'KHALTI',
      ref,
      amountNPR: order.amount_npr,
      // In real integration: return pidx/payment_url from Khalti.
      paymentUrl: `https://khalti.com/#/pay?ref=${encodeURIComponent(ref)}`,
    })
  })().catch(() => res.status(500).json({ error: 'Failed' }))
})

app.post('/api/payments/khalti/verify', authRequired, (req, res) => {
  const schema = z.object({ ref: z.string().min(1), status: z.enum(['success', 'failed']) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  ;(async () => {
    const payRes = await pool.query('SELECT id, order_id FROM payments WHERE ref = $1 AND gateway = $2', [
      parsed.data.ref,
      'KHALTI',
    ])
    const payment = payRes.rows[0]
    if (!payment) return res.status(404).json({ error: 'Payment not found' })

    const nextStatus = parsed.data.status === 'success' ? 'SUCCESS' : 'FAILED'
    await pool.query(`UPDATE payments SET status = $1, updated_at = now() WHERE id = $2`, [
      nextStatus,
      payment.id,
    ])
    await pool.query(`UPDATE orders SET payment_status = $1, payment_ref = $2 WHERE id = $3`, [
      nextStatus,
      parsed.data.ref,
      payment.order_id,
    ])

    return res.json({ ok: true, paymentStatus: nextStatus })
  })().catch(() => res.status(500).json({ error: 'Failed' }))
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

async function start() {
  await initDb()
  app.listen(PORT, () => {
    console.log(`Shipgoe backend listening on http://localhost:${PORT}`)
  })
}

start().catch((e) => {
  console.error('Failed to start server', e)
  process.exit(1)
})

