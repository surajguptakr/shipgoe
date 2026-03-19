export type TrackingStatus =
  | 'ORDER_PLACED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'ARRIVED_AT_HUB'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'

export type TrackingEvent = {
  at: string
  code: TrackingStatus
  label: string
  message?: string
  location?: string
}

export type TrackingPosition = {
  at: string
  lat: number
  lng: number
  accuracyM?: number
  speedKph?: number
  headingDeg?: number
}

export type TrackingShipment = {
  id: string
  from: string
  to: string
  mode: 'SURFACE' | 'AIR' | 'HYPERLOCAL'
  status: TrackingStatus
  eta?: string
  positions: TrackingPosition[]
  events: TrackingEvent[]
}

function apiBase(): string | null {
  const raw = import.meta.env.VITE_TRACKING_API_BASE as string | undefined
  if (!raw) return null
  return raw.replace(/\/+$/, '')
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase()
  if (!base) throw new Error('Tracking API base URL not configured')

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Tracking API error ${res.status}: ${text || res.statusText}`)
  }

  return (await res.json()) as T
}

export async function fetchShipment(awbOrId: string): Promise<TrackingShipment> {
  const q = encodeURIComponent(awbOrId.trim())
  return await http<TrackingShipment>(`/api/tracking/shipments/${q}`)
}

