import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'

type WalletState = {
  balanceNPR: number
}

type WalletApi = {
  state: WalletState
  refresh: () => Promise<void>
  addFunds: (amountNPR: number) => Promise<void>
}

const WalletContext = createContext<WalletApi | null>(null)

export function WalletProvider(props: { children: React.ReactNode }) {
  const auth = useAuth()
  const [balanceNPR, setBalanceNPR] = useState(0)

  const refresh = useCallback(async () => {
    if (auth.state.kind !== 'authenticated') {
      setBalanceNPR(0)
      return
    }
    const res = await apiFetch<{ balanceNPR: number }>('/api/wallet', { auth: true })
    setBalanceNPR(res.balanceNPR)
  }, [auth.state.kind])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addFunds = useCallback(
    async (amountNPR: number) => {
    if (!Number.isFinite(amountNPR) || amountNPR <= 0) return
    if (auth.state.kind !== 'authenticated') return
    const res = await apiFetch<{ balanceNPR: number }>('/api/wallet/topup', {
      method: 'POST',
      auth: true,
      json: { amountNPR: Math.floor(amountNPR) },
    })
    setBalanceNPR(res.balanceNPR)
    },
    [auth.state.kind],
  )

  const value = useMemo<WalletApi>(
    () => ({ state: { balanceNPR }, refresh, addFunds }),
    [addFunds, balanceNPR, refresh],
  )

  return <WalletContext.Provider value={value}>{props.children}</WalletContext.Provider>
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}

