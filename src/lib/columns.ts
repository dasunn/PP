import type { PreProdRow } from '../types'

export type ColKind = 'text' | 'chips'
// How the field is edited in the Edit-row modal.
// `list` / `colors` fields render as their own grid below the form.
export type EditKind = 'text' | 'date' | 'select' | 'merchant' | 'list' | 'colors'

export interface ColumnDef {
  key: keyof PreProdRow
  label: string
  kind: ColKind
  editKind?: EditKind // defaults to 'text'
  options?: string[] // for editKind === 'select'
}

export const NEW_REPEAT_OPTIONS = ['New', 'Repeat']
export const GRAPHIC_SO_OPTIONS = ['Approved', 'Pending', 'Hold']

// Ordered exactly as specified for the Pre-Prod grid.
export const COLUMNS: ColumnDef[] = [
  { key: 'season', label: 'Season', kind: 'text' },
  { key: 'inquiryNo', label: 'Inquiry No', kind: 'text' },
  { key: 'program', label: 'Program', kind: 'text' },
  { key: 'styleDescription', label: 'Style Description', kind: 'text' },
  { key: 'merchant', label: 'Bulk Merchant / PD Name', kind: 'text', editKind: 'merchant' },
  { key: 'globalStyle', label: 'Global Style', kind: 'text' },
  { key: 'm3Style', label: 'M3 Style', kind: 'text' },
  {
    key: 'newRepeat',
    label: 'New / Repeat',
    kind: 'text',
    editKind: 'select',
    options: NEW_REPEAT_OPTIONS,
  },
  { key: 'destinations', label: 'Destination', kind: 'chips', editKind: 'list' },
  { key: 'prodPlant', label: 'Prod Plant', kind: 'text' },
  { key: 'embPlant', label: 'Emb Plant', kind: 'text' },
  {
    key: 'graphicSoApproval',
    label: 'Graphic SO Approval Status',
    kind: 'text',
    editKind: 'select',
    options: GRAPHIC_SO_OPTIONS,
  },
  { key: 'ppColors', label: 'PP Color', kind: 'chips', editKind: 'colors' },
  { key: 'ppDate', label: 'PP Date', kind: 'text', editKind: 'date' },
]

// Shown in the chart (and exported) while no PP colour has been ticked yet.
export const PP_COLOR_PENDING = 'Pending'

// Cell value as a display string.
export function cellText(row: PreProdRow, col: ColumnDef): string {
  const v = row[col.key]
  if (col.key === 'ppColors') {
    const arr = (v as string[]) ?? []
    return arr.length ? arr.join(', ') : PP_COLOR_PENDING
  }
  if (Array.isArray(v)) return v.join(', ')
  return (v as string) ?? ''
}
