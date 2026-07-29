// ---- Domain types for the Pre-Prod Dashboard ----

import type { TnaIntervalDays } from './lib/tna'

export type { TnaIntervalDays }

export interface Merchant {
  id: string
  fullName: string
  email: string
  status: 'Active' | 'Inactive'
  createdAt: string
}

// A single Pre-Prod chart row = one unique GLOBAL STYLE.
// Multi-line order-chart values collapse into `destinations` / `colorOptions` arrays.
export interface PreProdRow {
  id: string
  season: string
  inquiryNo: string
  program: string
  styleDescription: string
  merchant: string // Bulk merchant / PD name
  globalStyle: string
  m3Style: string
  newRepeat: string
  destinations: string[] // chips
  prodPlant: string
  embPlant: string
  graphicSoApproval: string
  colorOptions: string[] // every colour read from the order chart
  ppColors: string[] // colours ticked as PP in edit mode; empty = "Pending"
  ppDate: string // yyyy-mm-dd when parseable
  createdAt: string
}

// A material line imported from the "Data" tab of a materials workbook.
// `style` joins to the Pre-Prod row's M3 Style.
export interface MaterialRow {
  id: string
  style: string
  prodGrp: string
  itemDescription: string
  matColour: string
  supplier: string
  createdAt: string
}

// A non-working date entered on the T&A setup → Holidays tab. Plan dates skip
// these when the T&A plan is generated.
export interface Holiday {
  id: string
  date: string // yyyy-mm-dd
  note: string
  createdAt: string
}

// User-entered dates for one event on one style. The `plan` date is not stored
// — it is always recalculated from PP Date + T&A intervals + holidays.
export interface TnaPlanCell {
  revised?: string // yyyy-mm-dd
  actual?: string // yyyy-mm-dd
}

/** Plan entries keyed by PreProdRow id, then by T&A event key. */
export type TnaPlans = Record<string, Record<string, TnaPlanCell>>

export type HistoryType = 'import' | 'export'

export interface HistoryEntry {
  id: string
  type: HistoryType
  fileName: string
  rows: number
  timestamp: string
}

export interface AppData {
  preProdRows: PreProdRow[]
  materials: MaterialRow[]
  merchants: Merchant[]
  history: HistoryEntry[]
  /** Days between each hard-coded T&A event pair, keyed by interval key. */
  tnaIntervalDays: TnaIntervalDays
  holidays: Holiday[]
  /** Revised-plan and actual dates captured on the T&A plan grid. */
  tnaPlans: TnaPlans
}

// Editable single-value fields on a PreProdRow (used by the edit form).
export type EditableTextField =
  | 'season'
  | 'inquiryNo'
  | 'program'
  | 'styleDescription'
  | 'merchant'
  | 'globalStyle'
  | 'm3Style'
  | 'newRepeat'
  | 'prodPlant'
  | 'embPlant'
  | 'graphicSoApproval'
  | 'ppDate'
