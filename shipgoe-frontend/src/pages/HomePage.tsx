import './HomePage.css'
import { useNavigate } from 'react-router-dom'

export function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="home-grid">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Shipgoe logistics network</p>
          <h1>One platform for parcels and 10‑minute deliveries.</h1>
          <p className="sub">
            Shipgoe connects intercity logistics and hyperlocal runners so you can move
            anything from a warehouse pallet to a late‑night snack.
          </p>
          <div className="hero-actions">
            <button className="primary" onClick={() => navigate('/track')}>
              Ship a parcel
            </button>
            <button className="ghost" onClick={() => navigate('/quick')}>
              Start quick delivery
            </button>
          </div>
          <div className="hero-metrics">
            <div>
              <span className="metric">26k+</span>
              <span className="label">Pincodes served</span>
            </div>
            <div>
              <span className="metric">12 min</span>
              <span className="label">Avg. hyperlocal ETA</span>
            </div>
            <div>
              <span className="metric">99.3%</span>
              <span className="label">On‑time deliveries</span>
            </div>
          </div>
        </div>
        <div className="hero-panel">
          <div className="card glass">
            <p className="card-title">Instant quote</p>
            <div className="field-row">
              <div>
                <label>Pickup</label>
                <input placeholder="Koramangala, BLR" />
              </div>
              <div>
                <label>Drop</label>
                <input placeholder="Andheri West, MUM" />
              </div>
            </div>
            <div className="field-row">
              <div>
                <label>Mode</label>
                <select defaultValue="surface">
                  <option value="surface">Surface</option>
                  <option value="air">Air</option>
                  <option value="hyperlocal">10‑min</option>
                </select>
              </div>
              <div>
                <label>Weight</label>
                <input placeholder="5 kg" />
              </div>
            </div>
            <div className="quote-row">
              <div>
                <div className="eta">ETA: 2‑3 days</div>
                <div className="badge-soft">Live tracking included</div>
              </div>
              <button className="primary wide" onClick={() => navigate('/checkout?flow=parcel')}>
                Schedule pickup
              </button>
            </div>
          </div>
          <div className="mini-stack">
            <div className="card tiny">
              <p className="tiny-label">Live network</p>
              <p className="tiny-value">142 riders near you</p>
            </div>
            <div className="card tiny green">
              <p className="tiny-label">Dark store</p>
              <p className="tiny-value">Shipgoe‑powered 10‑min hubs</p>
            </div>
          </div>
        </div>
      </section>

      <section className="strip">
        <p>Trusted by ecommerce, D2C and Q‑commerce teams for nationwide scale.</p>
      </section>

      <section className="grid-3">
        <div className="card">
          <h2>Intercity parcels</h2>
          <p>Door‑to‑door deliveries with COD, reverse pickups and NDR workflows.</p>
        </div>
        <div className="card">
          <h2>Hyperlocal runs</h2>
          <p>Fast delivery for groceries, food and pharmacy with 10‑minute ETAs.</p>
        </div>
        <div className="card">
          <h2>Unified tracking</h2>
          <p>Single Shipgoe tracking ID across linehaul, last mile and dark stores.</p>
        </div>
      </section>
    </div>
  )
}

