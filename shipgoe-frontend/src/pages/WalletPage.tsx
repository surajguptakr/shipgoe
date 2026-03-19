import { useState } from 'react'
import { useWallet } from '../wallet/WalletContext'
import { useAuth } from '../auth/AuthContext'
import './WalletPage.css'

export function WalletPage() {
  const auth = useAuth()
  const wallet = useWallet()
  const [amount, setAmount] = useState(500)

  return (
    <div className="wallet-page">
      <section className="wallet-hero">
        <h1>Shipgoe Wallet</h1>
        <p className="sub">Use wallet balance for fast checkout and COD partial payments.</p>
      </section>

      <section className="wallet-card">
        <div className="wallet-balance">
          <p className="label">Available balance</p>
          <p className="balance">NPR {wallet.state.balanceNPR.toLocaleString()}</p>
        </div>

        <div className="wallet-actions">
          <label>
            Add funds (NPR)
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </label>
          <button className="primary" onClick={() => void wallet.addFunds(amount)} disabled={auth.state.kind !== 'authenticated'}>
            Add to wallet
          </button>
        </div>

        <p className="hint">
          {auth.state.kind === 'authenticated'
            ? 'Wallet is stored in Shipgoe backend (SQLite).'
            : 'Please login to use wallet features.'}
        </p>
      </section>
    </div>
  )
}

