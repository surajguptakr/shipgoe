import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchShipment, type TrackingShipment } from '../api/tracking'

type State =
  | { kind: 'idle' }
  | { kind: 'loading'; awb: string }
  | { kind: 'ready'; awb: string; shipment: TrackingShipment; lastUpdatedAt: number }
  | { kind: 'error'; awb: string; message: string }

export function useLiveShipment(options?: { pollMs?: number }) {
  const pollMs = options?.pollMs ?? 4000

  const [state, setState] = useState<State>({ kind: 'idle' })
  const timer = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (timer.current != null) window.clearInterval(timer.current)
    timer.current = null
  }, [])

  const load = useCallback(
    async (awbRaw: string) => {
      const awb = awbRaw.trim()
      if (!awb) return

      stop()
      setState({ kind: 'loading', awb })

      try {
        const shipment = await fetchShipment(awb)
        setState({ kind: 'ready', awb, shipment, lastUpdatedAt: Date.now() })
      } catch (e) {
        setState({
          kind: 'error',
          awb,
          message: e instanceof Error ? e.message : 'Unknown error',
        })
        return
      }

      timer.current = window.setInterval(async () => {
        try {
          const shipment = await fetchShipment(awb)
          setState({ kind: 'ready', awb, shipment, lastUpdatedAt: Date.now() })
        } catch {
          // Keep last good state; a transient failure shouldn’t erase the UI.
        }
      }, pollMs)
    },
    [pollMs, stop],
  )

  useEffect(() => stop, [stop])

  const value = useMemo(() => ({ state, load, stop }), [load, state, stop])
  return value
}

