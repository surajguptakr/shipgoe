import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './LoginPage.css'

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="auth-page">
      <section className="auth-card">
        <h1>Customer login</h1>
        <p className="sub">
          Sign in to track your Shipgoe parcels, download PODs and manage addresses.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            void auth
              .login({ role: 'customer', identifier, password })
              .then(() => navigate('/'))
              .catch((e2) => setError(e2 instanceof Error ? e2.message : 'Login failed'))
          }}
        >
          <label>
            Email or mobile
            <input
              placeholder="you@example.com / 98XXXXXXXX"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit" className="primary wide">
            Continue
          </button>
          {error && <p className="helper">{error}</p>}
        </form>
      </section>
    </div>
  )
}

