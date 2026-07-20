import type { PreProdRow } from '../types'

export type ColKind = 'text' | 'chips'

export interface ColumnDef {
  key: keyof PreProdRow
  label: string
  kind: ColKind
  manual?: boolean // filled in manually by user (starts empty)
}

// Ordered exactly as specified for the Pre-Prod grid.
export const COLUMNS: ColumnDef[] = [
  { key: 'season', label: 'Season', kind: 'text' },
  { key: 'inquiryNo', label: 'Inquiry No', kind: 'text' },
  { key: 'program', label: 'Program', kind: 'text' },
  { key: 'fabricQuality', label: 'Fabric Quality', kind: 'text', manual: true },
  { key: 'styleDescription', label: 'Style Description', kind: 'text' },
  { key: 'fabricMill', label: 'Fabric Mill', kind: 'text', manual: true },
  { key: 'merchant', label: 'Bulk Merchant / PD Name', kind: 'text' },
  { key: 'globalStyle', label: 'Global Style', kind: 'text' },
  { key: 'm3Style', label: 'M3 Style', kind: 'text' },
  { key: 'newRepeat', label: 'New / Repeat', kind: 'text' },
  { key: 'destinations', label: 'Destination', kind: 'chips' },
  { key: 'prodPlant', label: 'Prod Plant', kind: 'text' },
  { key: 'embPlant', label: 'Emb Plant', kind: 'text' },
  { key: 'graphicSoApproval', label: 'Graphic SO Approval Status', kind: 'text' },
  { key: 'ppColors', label: 'PP Color', kind: 'chips' },
  { key: 'ppDate', label: 'PP Date', kind: 'text' },
]

// Cell value as a display string.
export function cellText(row: PreProdRow, col: ColumnDef): string {
  const v = row[col.key]
  if (Array.isArray(v)) return v.join(', ')
  return (v as string) ?? ''
}
