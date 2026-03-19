import { useState } from 'react'
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import './App.css'
import { HomePage } from './pages/HomePage'
import { TrackPage } from './pages/TrackPage'
import { QuickCommercePage } from './pages/QuickCommercePage'
import { LoginPage } from './pages/LoginPage'
import { PartnerLoginPage } from './pages/PartnerLoginPage'
import { WalletPage } from './pages/WalletPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { useWallet } from './wallet/WalletContext'

function AppShell() {
  const [navOpen, setNavOpen] = useState(false)
  const navigate = useNavigate()
  const wallet = useWallet()

  return (
    <div className="app-root">
      <header className="top-nav">
        <div className="brand">
          <span className="brand-mark">S</span>
          <span className="brand-text">shipgoe</span>
        </div>
        <button
          className="nav-toggle"
          type="button"
          onClick={() => setNavOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav className={`nav-links ${navOpen ? 'open' : ''}`}>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Home
          </NavLink>
          <NavLink to="/track" className={({ isActive }) => (isActive ? 'active' : '')}>
            Track shipment
          </NavLink>
          <NavLink
            to="/quick"
            className={({ isActive }) => (isActive ? 'active pill' : 'pill')}
          >
            10-min delivery
          </NavLink>
        </nav>
        <div className={`nav-actions ${navOpen ? 'open' : ''}`}>
          <button className="wallet-pill" onClick={() => navigate('/wallet')}>
            Wallet: NPR {wallet.state.balanceNPR.toLocaleString()}
          </button>
          <button className="ghost" onClick={() => navigate('/partner-login')}>
            Partner login
          </button>
          <button className="primary" onClick={() => navigate('/login')}>
            Customer login
          </button>
        </div>
      </header>

      <main className="main-shell">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/track" element={<TrackPage />} />
          <Route path="/quick" element={<QuickCommercePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/partner-login" element={<PartnerLoginPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
        </Routes>
      </main>

      <footer className="footer">
        <span>© {new Date().getFullYear()} Shipgoe Logistics</span>
        <span>Built for hyperlocal + intercity logistics</span>
      </footer>
    </div>
  )
}

function App() {
  return <AppShell />
}

export default App
