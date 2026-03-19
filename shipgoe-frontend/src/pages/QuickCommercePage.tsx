import './QuickCommercePage.css'
import { useNavigate } from 'react-router-dom'

type Slot = {
  id: string
  label: string
  eta: string
  surge?: boolean
}

const SLOTS: Slot[] = [
  { id: 'now', label: 'Deliver now', eta: '10–15 min' },
  { id: '30', label: 'In 30 min', eta: '30–40 min' },
  { id: '60', label: 'In 1 hour', eta: '60–75 min', surge: true },
]

export function QuickCommercePage() {
  const navigate = useNavigate()

  return (
    <div className="qc-layout">
      <section className="qc-left">
        <h1>10‑minute deliveries, powered by Shipgoe.</h1>
        <p className="sub">
          Dark stores, smart batching and dedicated riders — all plugged into the same
          Shipgoe network.
        </p>

        <div className="qc-slots">
          <p className="label">Choose a slot</p>
          <div className="slot-row">
            {SLOTS.map((slot) => (
              <button
                key={slot.id}
                className={`slot${slot.id === 'now' ? ' active' : ''}${
                  slot.surge ? ' surge' : ''
                }`}
              >
                <span className="slot-main">{slot.label}</span>
                <span className="slot-eta">{slot.eta}</span>
                {slot.surge && <span className="slot-tag">High demand</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="qc-highlights">
          <div>
            <h2>Dark store ready</h2>
            <p>Catalog, picking and routing connected to your inventory system.</p>
          </div>
          <div>
            <h2>Promise engine</h2>
            <p>Show city‑wise promises and live ETAs on your ecommerce site.</p>
          </div>
        </div>
      </section>

      <section className="qc-right">
        <div className="qc-cart card">
          <div className="qc-cart-header">
            <p className="label">Sample basket</p>
            <p className="mini-pill">Hyperlocal demo</p>
          </div>
          <ul className="qc-items">
            <li>
              <div>
                <p className="name">Fresh fruits box</p>
                <p className="meta">Packed from nearest dark store</p>
              </div>
              <p className="price">₹249</p>
            </li>
            <li>
              <div>
                <p className="name">Cold coffee</p>
                <p className="meta">Temperature‑controlled rider bag</p>
              </div>
              <p className="price">₹129</p>
            </li>
            <li>
              <div>
                <p className="name">Emergency meds</p>
                <p className="meta">Partnered pharmacy network</p>
              </div>
              <p className="price">₹349</p>
            </li>
          </ul>
          <div className="qc-summary">
            <div>
              <p className="row">
                Items <span>₹727</span>
              </p>
              <p className="row">
                Delivery (10 min) <span className="free">Free</span>
              </p>
              <p className="row total">
                Payable <span>₹727</span>
              </p>
            </div>
            <button className="primary wide" onClick={() => navigate('/checkout?flow=quick')}>
              Checkout
            </button>
          </div>
        </div>

        <div className="qc-badges">
          <span>Real‑time rider allocation</span>
          <span>Distance‑based pricing</span>
          <span>Live order tracking</span>
        </div>
      </section>
    </div>
  )
}

