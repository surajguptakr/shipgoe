const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
  if (!token) return res.status(401).json({ error: 'Missing bearer token' })

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

module.exports = { signToken, authRequired }

