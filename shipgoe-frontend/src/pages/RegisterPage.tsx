import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './LoginPage.css'

type Role = 'customer' | 'partner'

export function RegisterPage() {
  const auth = useAuth()
  const navigate = useNavigate()

  const [role, setRole] = useState<Role>('customer')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="auth-page">
      <section className="auth-card">
        <h1>Create account</h1>
        <p className="sub">Create a Shipgoe account to use wallet and manage orders.</p>

        <div className="auth-tabs">
          <button
            type="button"
            className={role === 'customer' ? 'on' : ''}
            onClick={() => setRole('customer')}
          >
            Customer
          </button>
          <button
            type="button"
            className={role === 'partner' ? 'on' : ''}
            onClick={() => setRole('partner')}
          >
            Partner
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            void auth
              .register({ role, identifier, password })
              .then(() => navigate('/'))
              .catch((e2) => setError(e2 instanceof Error ? e2.message : 'Register failed'))
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
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit" className="primary wide">
            Create account
          </button>
          {error && <p className="helper">{error}</p>}
        </form>
      </section>
    </div>
  )
}

