import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type {
  AppData,
  HistoryEntry,
  Holiday,
  MaterialRow,
  Merchant,
  PreProdRow,
  TnaPlanCell,
} from '../types'
import { styleKey } from '../lib/materials'

const STORAGE_KEY = 'preprod-dashboard-data-v1'

const emptyData: AppData = {
  preProdRows: [],
  materials: [],
  merchants: [],
  history: [],
  tnaIntervalDays: {},
  holidays: [],
  tnaPlans: {},
}

/**
 * Rows saved before the PP-colour workflow kept every order-chart colour in
 * `ppColors`. Those become the pickable `colorOptions`, and `ppColors` resets
 * to empty so the chart shows "Pending" until a colour is ticked.
 */
function migrateRow(row: PreProdRow): PreProdRow {
  if (row.colorOptions) return row
  return { ...row, colorOptions: row.ppColors ?? [], ppColors: [] }
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedData()
    const parsed = JSON.parse(raw) as AppData
    return {
      preProdRows: (parsed.preProdRows ?? []).map(migrateRow),
      materials: parsed.materials ?? [],
      merchants: parsed.merchants ?? [],
      history: parsed.history ?? [],
      tnaIntervalDays: parsed.tnaIntervalDays ?? {},
      holidays: parsed.holidays ?? [],
      tnaPlans: parsed.tnaPlans ?? {},
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
    materials: [],
    merchants: [
      { id: uid(), fullName: 'Nimal Perera', email: 'nimal.perera@example.com', status: 'Active', createdAt: now },
      { id: uid(), fullName: 'Kasun Silva', email: 'kasun.silva@example.com', status: 'Active', createdAt: now },
    ],
    history: [],
    tnaIntervalDays: {},
    holidays: [],
    tnaPlans: {},
  }
}

// Holidays always read chronologically, whatever order they were entered in.
function sortHolidays(list: Holiday[]): Holiday[] {
  return [...list].sort((a, b) => a.date.localeCompare(b.date))
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

interface StoreValue extends AppData {
  // Pre-prod rows
  addPreProdRows: (rows: PreProdRow[]) => void
  updatePreProdRow: (row: PreProdRow) => void
  deletePreProdRow: (id: string) => void
  // Materials
  addMaterials: (rows: MaterialRow[]) => void
  clearMaterials: () => void
  // Merchants
  addMerchant: (m: Omit<Merchant, 'id' | 'createdAt'>) => void
  updateMerchant: (m: Merchant) => void
  deleteMerchant: (id: string) => void
  // T&A setup
  setIntervalDays: (key: string, days: number | null) => void
  clearIntervalDays: () => void
  addHoliday: (h: Omit<Holiday, 'id' | 'createdAt'>) => void
  updateHoliday: (h: Holiday) => void
  deleteHoliday: (id: string) => void
  // T&A plan
  setPlanDate: (rowId: string, eventKey: string, field: keyof TnaPlanCell, value: string) => void
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

    // The style's T&A plan entry goes with it — nothing else references the id.
    deletePreProdRow: (id) =>
      setData((d) => {
        const plans = { ...d.tnaPlans }
        delete plans[id]
        return { ...d, preProdRows: d.preProdRows.filter((r) => r.id !== id), tnaPlans: plans }
      }),

    // Re-uploading a style replaces its material lines rather than duplicating
    // them; styles absent from the upload keep whatever was imported before.
    addMaterials: (rows) =>
      setData((d) => {
        const incoming = new Set(rows.map((r) => styleKey(r.style)))
        const kept = d.materials.filter((m) => !incoming.has(styleKey(m.style)))
        return { ...d, materials: [...rows, ...kept] }
      }),

    clearMaterials: () => setData((d) => ({ ...d, materials: [] })),

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

    // Clearing a cell drops the key entirely, so "not set" stays distinct from 0.
    setIntervalDays: (key, days) =>
      setData((d) => {
        const next = { ...d.tnaIntervalDays }
        if (days === null) delete next[key]
        else next[key] = days
        return { ...d, tnaIntervalDays: next }
      }),

    clearIntervalDays: () => setData((d) => ({ ...d, tnaIntervalDays: {} })),

    addHoliday: (h) =>
      setData((d) => ({
        ...d,
        holidays: sortHolidays([
          { ...h, id: uid(), createdAt: new Date().toISOString() },
          ...d.holidays,
        ]),
      })),

    updateHoliday: (h) =>
      setData((d) => ({
        ...d,
        holidays: sortHolidays(d.holidays.map((x) => (x.id === h.id ? h : x))),
      })),

    deleteHoliday: (id) =>
      setData((d) => ({ ...d, holidays: d.holidays.filter((x) => x.id !== id) })),

    // Clearing a date drops the field, and the row's entry once it holds nothing.
    setPlanDate: (rowId, eventKey, field, value) =>
      setData((d) => {
        const forRow = { ...(d.tnaPlans[rowId] ?? {}) }
        const cell: TnaPlanCell = { ...(forRow[eventKey] ?? {}) }
        if (value) cell[field] = value
        else delete cell[field]

        if (Object.keys(cell).length === 0) delete forRow[eventKey]
        else forRow[eventKey] = cell

        const plans = { ...d.tnaPlans }
        if (Object.keys(forRow).length === 0) delete plans[rowId]
        else plans[rowId] = forRow
        return { ...d, tnaPlans: plans }
      }),

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
