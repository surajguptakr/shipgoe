import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './LoginPage.css'

export function PartnerLoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="auth-page">
      <section className="auth-card">
        <h1>Partner login</h1>
        <p className="sub">
          Shipgoe partners in Nepal can view manifests, COD status and rider locations.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            void auth
              .login({ role: 'partner', identifier, password })
              .then(() => navigate('/'))
              .catch((e2) => setError(e2 instanceof Error ? e2.message : 'Login failed'))
          }}
        >
          <label>
            Partner ID
            <input
              placeholder="e.g. 98XXXXXXXX or partner@email.com"
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

