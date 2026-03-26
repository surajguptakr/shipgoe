import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import './TrackPage.css'

type TrackingStatus = 'ORDER_PLACED' | 'PICKED_UP' | 'IN_TRANSIT' | 'ARRIVED_AT_HUB' | 'OUT_FOR_DELIVERY' | 'DELIVERED'
type TrackingEvent = { at: string; code: TrackingStatus; label: string; message?: string; location?: string }
type TrackingPosition = { at: string; lat: number; lng: number; speedKph?: number }
type TrackingShipment = {
  id: string; awb: string; from: string; to: string
  mode: 'SURFACE' | 'AIR' | 'HYPERLOCAL'
  status: TrackingStatus; eta?: string
  positions: TrackingPosition[]; events: TrackingEvent[]
}

const STATUS_LABELS: Record<TrackingStatus, string> = {
  ORDER_PLACED: 'Order Placed', PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit', ARRIVED_AT_HUB: 'Arrived at Hub',
  OUT_FOR_DELIVERY: 'Out for Delivery', DELIVERED: 'Delivered'
}
const STATUS_ORDER: TrackingStatus[] = [
  'ORDER_PLACED','PICKED_UP','IN_TRANSIT','ARRIVED_AT_HUB','OUT_FOR_DELIVERY','DELIVERED'
]
const API = (import.meta.env.VITE_TRACKING_API_BASE as string ?? '').replace(/\/+$/, '')

async function fetchShipment(awb: string): Promise<TrackingShipment> {
  const res = await fetch(`${API}/api/tracking/shipments/${encodeURIComponent(awb)}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data?.message ?? 'Shipment not found.')
  return data
}

async function fetchLivePosition(id: string): Promise<TrackingPosition | null> {
  try {
    const res = await fetch(`${API}/api/tracking/shipments/${id}/position`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('shipgoe_auth_token') ?? ''}` }
    })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export function TrackPage() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('awb') ?? '')
  const [shipment, setShipment] = useState<TrackingShipment | null>(null)
  const [livePos, setLivePos] = useState<TrackingPosition | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function track(awb: string) {
    if (!awb.trim()) return
    setLoading(true); setError(null); setShipment(null); setLivePos(null)
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    try {
      const data = await fetchShipment(awb.trim())
      setShipment(data)
      setParams({ awb: awb.trim() })
      if (data.status !== 'DELIVERED') {
        pollRef.current = setInterval(async () => {
          const pos = await fetchLivePosition(data.id)
          if (pos) setLivePos(pos)
        }, 20000)
      }
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Shipment not found.')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    const awb = params.get('awb')
    if (awb) track(awb)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const stepIdx = shipment ? STATUS_ORDER.indexOf(shipment.status) : -1

  return (
    <div className="track-page">
      <h1>Track shipment</h1>
      <p className="track-sub">Enter your AWB number or shipment ID</p>

      <form className="track-form" onSubmit={(e: FormEvent) => { e.preventDefault(); track(query) }}>
        <input className="track-input" type="text"
          placeholder="e.g. SG-2025-001234" value={query}
          onChange={(e) => setQuery(e.target.value)} />
        <button className="track-btn" type="submit" disabled={loading || !query.trim()}>
          {loading ? 'Tracking…' : 'Track'}
        </button>
      </form>

      {error && <div className="track-error">{error}</div>}

      {shipment && (
        <div className="track-result">
          <div className="track-header">
            <div>
              <div className="track-awb">{shipment.awb ?? shipment.id}</div>
              <div className="track-route">{shipment.from} → {shipment.to}</div>
            </div>
            <span className={`track-mode-badge track-mode-${shipment.mode.toLowerCase()}`}>
              {shipment.mode === 'HYPERLOCAL' ? '⚡ 10-min' : shipment.mode}
            </span>
          </div>

          <div className="track-progress">
            {STATUS_ORDER.map((status, i) => (
              <div key={status} className={`track-step${i <= stepIdx ? ' done' : ''}${i === stepIdx ? ' current' : ''}`}>
                <div className="track-dot" />
                <span className="track-step-label">{STATUS_LABELS[status]}</span>
              </div>
            ))}
            <div className="track-fill"
              style={{ width: `${stepIdx < 0 ? 0 : (stepIdx / (STATUS_ORDER.length - 1)) * 100}%` }} />
          </div>

          {shipment.eta && (
            <div className="track-eta">
              Estimated delivery: <strong>{new Date(shipment.eta).toLocaleString()}</strong>
            </div>
          )}

          {livePos && (
            <div className="track-live">
              <span className="live-dot" /> Live — last update {new Date(livePos.at).toLocaleTimeString()}
              {livePos.speedKph != null && ` · ${livePos.speedKph.toFixed(0)} km/h`}
            </div>
          )}

          <div className="track-timeline">
            <h3>Shipment history</h3>
            <ul className="timeline-list">
              {[...shipment.events].reverse().map((evt, i) => (
                <li key={i} className={`timeline-item${i === 0 ? ' latest' : ''}`}>
                  <div className="timeline-marker" />
                  <div className="timeline-body">
                    <div className="timeline-label">{evt.label}</div>
                    {evt.message && <div className="timeline-msg">{evt.message}</div>}
                    <div className="timeline-meta">
                      {evt.location && <span>{evt.location}</span>}
                      <span>{new Date(evt.at).toLocaleString()}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
