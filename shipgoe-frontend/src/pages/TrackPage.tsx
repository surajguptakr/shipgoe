import { useMemo, useState } from 'react'
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './TrackPage.css'
import { useLiveShipment } from '../hooks/useLiveShipment'
import type { TrackingShipment } from '../api/tracking'

function mapMode(mode: TrackingShipment['mode']): string {
  if (mode === 'AIR') return 'Air'
  if (mode === 'HYPERLOCAL') return 'Hyperlocal'
  return 'Surface'
}

function mapStatusLabel(code: TrackingShipment['status']): string {
  switch (code) {
    case 'ORDER_PLACED':
      return 'Order placed'
    case 'PICKED_UP':
      return 'Picked up'
    case 'IN_TRANSIT':
      return 'In transit'
    case 'ARRIVED_AT_HUB':
      return 'Arrived at hub'
    case 'OUT_FOR_DELIVERY':
      return 'Out for delivery'
    case 'DELIVERED':
      return 'Delivered'
    default:
      return 'In transit'
  }
}

function statusOrder(): string[] {
  return [
    'Order placed',
    'Picked up',
    'In transit',
    'Arrived at hub',
    'Out for delivery',
    'Delivered',
  ]
}

function computeProgress(statusLabel: string): number {
  const steps = statusOrder()
  const idx = steps.indexOf(statusLabel)
  if (idx < 0) return 10
  return Math.round((idx / (steps.length - 1)) * 100)
}

function toLatLng(route: TrackingShipment['positions']): LatLngExpression[] {
  return route.map((p) => [p.lat, p.lng] as LatLngExpression)
}

export function TrackPage() {
  const [awb, setAwb] = useState('SGE123456789')
  const live = useLiveShipment({ pollMs: 4000 })

  const shipment: TrackingShipment | null =
    live.state.kind === 'ready' ? live.state.shipment : null

  const positions = shipment?.positions?.length ? toLatLng(shipment.positions) : null
  const route = positions ?? []
  const statusLabel = shipment ? mapStatusLabel(shipment.status) : 'In transit'
  const progress = shipment ? computeProgress(statusLabel) : 0

  const activePosition = useMemo(() => {
    if (route.length >= 1) return route[route.length - 1]
    return [19.075983, 72.877655] as LatLngExpression
  }, [route])

  return (
    <div className="track-layout">
      <section className="track-left">
        <h1>Track your shipment</h1>
        <p className="sub">
          Live map updates, courier‑style events, and a single Shipgoe tracking ID.
        </p>

        <div className="track-search">
          <label htmlFor="awb">Enter AWB / Order ID</label>
          <div className="search-row">
            <input
              id="awb"
              placeholder="e.g. SGE123456789"
              value={awb}
              onChange={(e) => setAwb(e.target.value)}
            />
            <button
              className="primary"
              onClick={() => live.load(awb)}
              disabled={live.state.kind === 'loading'}
            >
              {live.state.kind === 'loading' ? 'Tracking…' : 'Track'}
            </button>
          </div>
          <p className="hint">
            {import.meta.env.VITE_TRACKING_API_BASE
              ? 'Connected to your Shipgoe tracking API.'
              : 'Set VITE_TRACKING_API_BASE to connect this page to your Shipgoe tracking API.'}
          </p>
        </div>

        {live.state.kind === 'error' && (
          <div className="error-banner">
            <strong>Tracking error.</strong> {live.state.message}
          </div>
        )}

        <div className="shipment-card">
          <div className="shipment-header">
            <div>
              <p className="label">Shipgoe ID</p>
              <p className="value">{(shipment?.id ?? awb.trim()) || '—'}</p>
            </div>
            <div className="chip">{shipment ? mapMode(shipment.mode) : '—'}</div>
          </div>
          <div className="shipment-route">
            <div>
              <p className="label">From</p>
              <p className="value">{shipment?.from ?? '—'}</p>
            </div>
            <div className="arrow">→</div>
            <div>
              <p className="label">To</p>
              <p className="value">{shipment?.to ?? '—'}</p>
            </div>
          </div>
          <div className="progress">
            <div className="bar">
              <div className="fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="percent">{progress}%</span>
          </div>
          <div className="status-row">
            <span className="status-dot" />
            <span className="status-text">{statusLabel}</span>
            <span className="eta-pill">ETA: {shipment?.eta ?? '—'}</span>
          </div>
        </div>

        <ol className="timeline">
          {statusOrder().map((label) => {
            const isActive = label === statusLabel
            const isComplete =
              statusOrder().indexOf(label) < statusOrder().indexOf(statusLabel)
            return (
              <li
                key={label}
                className={`timeline-item${isActive ? ' active' : ''}${
                  isComplete ? ' complete' : ''
                }`}
              >
                <div className="dot" />
                <div className="content">
                  <p className="title">{label}</p>
                  <p className="meta">
                    {live.state.kind === 'ready'
                      ? `Updated ${Math.round((Date.now() - live.state.lastUpdatedAt) / 1000)}s ago`
                      : 'Auto‑updated from Shipgoe network'}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="track-map-wrapper">
        <div className="map-card">
          {route.length ? (
            <MapContainer
              center={route[0]}
              zoom={11}
              scrollWheelZoom={false}
              className="map"
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Polyline positions={route} pathOptions={{ color: '#4f46e5' }} />
              <Marker position={route[0]} />
              <Marker position={route[route.length - 1]} />
              <Marker position={activePosition} />
            </MapContainer>
          ) : (
            <div className="map-empty">
              <p className="title">No live positions yet</p>
              <p className="meta">Track an ID to load current rider GPS points.</p>
            </div>
          )}
        </div>
        <div className="map-legend">
          <p className="label">Live movement</p>
          <p className="meta">
            {route.length
              ? `Showing ${route.length} GPS points from your backend.`
              : 'Waiting for live GPS points.'}
          </p>
        </div>
      </section>
    </div>
  )
}

