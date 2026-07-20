import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AppData, HistoryEntry, Merchant, PreProdRow } from '../types'

const STORAGE_KEY = 'preprod-dashboard-data-v1'

const emptyData: AppData = {
  preProdRows: [],
  merchants: [],
  history: [],
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedData()
    const parsed = JSON.parse(raw) as AppData
    return {
      preProdRows: parsed.preProdRows ?? [],
      merchants: parsed.merchants ?? [],
      history: parsed.history ?? [],
    }
  } catch {
    return emptyData
  }
}

// A couple of demo merchants so the lookup isn't empty on first run.
function seedData(): AppData {
  const now = new Date().toISOString()
  return {
    preProdRows: [],
    merchants: [
      { id: uid(), fullName: 'Nimal Perera', email: 'nimal.perera@example.com', status: 'Active', createdAt: now },
      { id: uid(), fullName: 'Kasun Silva', email: 'kasun.silva@example.com', status: 'Active', createdAt: now },
    ],
    history: [],
  }
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

interface StoreValue extends AppData {
  // Pre-prod rows
  addPreProdRows: (rows: PreProdRow[]) => void
  updatePreProdRow: (row: PreProdRow) => void
  deletePreProdRow: (id: string) => void
  // Merchants
  addMerchant: (m: Omit<Merchant, 'id' | 'createdAt'>) => void
  updateMerchant: (m: Merchant) => void
  deleteMerchant: (id: string) => void
  // History
  addHistory: (h: Omit<HistoryEntry, 'id' | 'timestamp'>) => void
  clearAll: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => load())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  const value: StoreValue = {
    ...data,

    addPreProdRows: (rows) =>
      setData((d) => ({ ...d, preProdRows: [...rows, ...d.preProdRows] })),

    updatePreProdRow: (row) =>
      setData((d) => ({
        ...d,
        preProdRows: d.preProdRows.map((r) => (r.id === row.id ? row : r)),
      })),

    deletePreProdRow: (id) =>
      setData((d) => ({ ...d, preProdRows: d.preProdRows.filter((r) => r.id !== id) })),

    addMerchant: (m) =>
      setData((d) => ({
        ...d,
        merchants: [
          { ...m, id: uid(), createdAt: new Date().toISOString() },
          ...d.merchants,
        ],
      })),

    updateMerchant: (m) =>
      setData((d) => ({
        ...d,
        merchants: d.merchants.map((x) => (x.id === m.id ? m : x)),
      })),

    deleteMerchant: (id) =>
      setData((d) => ({ ...d, merchants: d.merchants.filter((x) => x.id !== id) })),

    addHistory: (h) =>
      setData((d) => ({
        ...d,
        history: [
          { ...h, id: uid(), timestamp: new Date().toISOString() },
          ...d.history,
        ],
      })),

    clearAll: () => setData(emptyData),
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
