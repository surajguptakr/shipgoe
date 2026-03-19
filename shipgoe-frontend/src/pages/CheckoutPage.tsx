import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useWallet } from '../wallet/WalletContext'
import './CheckoutPage.css'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'

type PaymentTiming = 'PAY_NOW' | 'PAY_ON_DELIVERY'
type PaymentMethod = 'WALLET' | 'CARD' | 'UPI' | 'COD'

export function CheckoutPage() {
  const auth = useAuth()
  const wallet = useWallet()
  const [params] = useSearchParams()
  const flow = (params.get('flow') ?? 'parcel') as 'parcel' | 'quick'

  const amountNPR = useMemo(() => (flow === 'quick' ? 727 : 320), [flow])

  const [timing, setTiming] = useState<PaymentTiming>('PAY_NOW')
  const [method, setMethod] = useState<PaymentMethod>('WALLET')
  const [message, setMessage] = useState<string | null>(null)

  const codAllowed = flow === 'parcel'

  async function placeOrder() {
    setMessage(null)

    if (auth.state.kind !== 'authenticated') {
      setMessage('Please login before placing an order.')
      return
    }

    try {
      const res = await apiFetch<{ orderId: number; status: string }>('/api/orders', {
        method: 'POST',
        auth: true,
        json: {
          flow,
          amountNPR,
          paymentTiming: timing,
          paymentMethod: method,
        },
      })
      await wallet.refresh()
      setMessage(`Order #${res.orderId} created. Status: ${res.status}`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to place order')
    }
  }

  return (
    <div className="checkout-layout">
      <section className="checkout-left">
        <h1>Checkout</h1>
        <p className="sub">
          Choose when to pay and your preferred method. Shipgoe supports prepaid and
          pay‑on‑delivery depending on the service.
        </p>

        <div className="checkout-card">
          <p className="section-title">Payment timing</p>
          <div className="segmented">
            <button
              className={timing === 'PAY_NOW' ? 'on' : ''}
              onClick={() => {
                setTiming('PAY_NOW')
                setMethod('WALLET')
              }}
              type="button"
            >
              Pay now
            </button>
            <button
              className={timing === 'PAY_ON_DELIVERY' ? 'on' : ''}
              onClick={() => {
                setTiming('PAY_ON_DELIVERY')
                setMethod('COD')
              }}
              type="button"
              disabled={!codAllowed}
            >
              Pay on delivery
            </button>
          </div>
          {!codAllowed && (
            <p className="hint">Pay on delivery is disabled for 10‑minute deliveries.</p>
          )}

          <p className="section-title">Payment method</p>
          <div className="methods">
            <label className={`method ${method === 'WALLET' ? 'active' : ''}`}>
              <input
                type="radio"
                name="method"
                checked={method === 'WALLET'}
                onChange={() => setMethod('WALLET')}
                disabled={timing !== 'PAY_NOW'}
              />
              <div>
                <p className="name">Shipgoe Wallet</p>
                <p className="meta">Balance: NPR {wallet.state.balanceNPR.toLocaleString()}</p>
              </div>
            </label>

            <label className={`method ${method === 'UPI' ? 'active' : ''}`}>
              <input
                type="radio"
                name="method"
                checked={method === 'UPI'}
                onChange={() => setMethod('UPI')}
                disabled={timing !== 'PAY_NOW'}
              />
              <div>
                <p className="name">UPI / Mobile wallet</p>
                <p className="meta">Connect Khalti/eSewa later</p>
              </div>
            </label>

            <label className={`method ${method === 'CARD' ? 'active' : ''}`}>
              <input
                type="radio"
                name="method"
                checked={method === 'CARD'}
                onChange={() => setMethod('CARD')}
                disabled={timing !== 'PAY_NOW'}
              />
              <div>
                <p className="name">Card</p>
                <p className="meta">Visa / Mastercard</p>
              </div>
            </label>

            <label className={`method ${method === 'COD' ? 'active' : ''}`}>
              <input
                type="radio"
                name="method"
                checked={method === 'COD'}
                onChange={() => setMethod('COD')}
                disabled={timing !== 'PAY_ON_DELIVERY' || !codAllowed}
              />
              <div>
                <p className="name">Cash on Delivery (COD)</p>
                <p className="meta">Pay after delivery</p>
              </div>
            </label>
          </div>

          <button className="primary wide" onClick={() => void placeOrder()} type="button">
            Place order
          </button>

          {message && <div className="checkout-message">{message}</div>}
        </div>
      </section>

      <aside className="checkout-right">
        <div className="summary-card">
          <p className="section-title">Order summary</p>
          <p className="row">
            Service <span>{flow === 'quick' ? '10‑minute delivery' : 'Parcel pickup'}</span>
          </p>
          <p className="row">
            Charges <span>NPR {amountNPR.toLocaleString()}</span>
          </p>
          <p className="row total">
            Payable <span>NPR {amountNPR.toLocaleString()}</span>
          </p>
          <p className="hint">
            This is a UI checkout flow. Next step is connecting to the payment gateway and
            order creation API.
          </p>
        </div>
      </aside>
    </div>
  )
}

