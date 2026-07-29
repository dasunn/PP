// ---- Domain types for the Pre-Prod Dashboard ----

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
  merchants: Merchant[]
  history: HistoryEntry[]
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
