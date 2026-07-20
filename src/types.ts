// ---- Domain types for the Pre-Prod Dashboard ----

export interface Merchant {
  id: string
  fullName: string
  email: string
  status: 'Active' | 'Inactive'
  createdAt: string
}

// A single Pre-Prod chart row = one unique GLOBAL STYLE.
// Multi-line order-chart values collapse into `destinations` / `ppColors` arrays.
export interface PreProdRow {
  id: string
  season: string
  inquiryNo: string
  program: string
  fabricQuality: string // manual entry
  styleDescription: string
  fabricMill: string // manual entry
  merchant: string // Bulk merchant / PD name
  globalStyle: string
  m3Style: string
  newRepeat: string
  destinations: string[] // chips
  prodPlant: string
  embPlant: string
  graphicSoApproval: string
  ppColors: string[] // chips
  ppDate: string
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
  | 'fabricQuality'
  | 'styleDescription'
  | 'fabricMill'
  | 'merchant'
  | 'globalStyle'
  | 'm3Style'
  | 'newRepeat'
  | 'prodPlant'
  | 'embPlant'
  | 'graphicSoApproval'
  | 'ppDate'
