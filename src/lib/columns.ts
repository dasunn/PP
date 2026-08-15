import type { PreProdRow } from '../types'

// `status` renders as a single colour-coded chip; `chips` as a pill per value.
export type ColKind = 'text' | 'chips' | 'status'
// How the field is edited in the Edit-row modal.
// `list` / `colors` fields render as their own grid below the form.
export type EditKind = 'text' | 'date' | 'select' | 'merchant' | 'list' | 'colors'

export interface ColumnDef {
  key: keyof PreProdRow
  label: string
  kind: ColKind
  editKind?: EditKind // defaults to 'text'
  options?: string[] // for editKind === 'select'
  /** Drop the blank "—" choice: the field always holds one of `options`. */
  noBlank?: boolean
}

export const NEW_REPEAT_OPTIONS = ['New', 'Repeat']
export const GRAPHIC_SO_OPTIONS = ['Approved', 'Pending', 'Hold']

// ---- PP Status: the two-state PP approval flag ----
export const PP_STATUS_APPROVED = 'Approved'
export const PP_STATUS_NOT_APPROVED = 'Not Approved'
export const PP_STATUS_OPTIONS = [PP_STATUS_APPROVED, PP_STATUS_NOT_APPROVED]

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
    kind: 'status',
    editKind: 'select',
    options: GRAPHIC_SO_OPTIONS,
  },
  { key: 'ppColors', label: 'PP Color', kind: 'text', editKind: 'colors' },
  {
    key: 'ppStatus',
    label: 'PP Status',
    kind: 'status',
    editKind: 'select',
    options: PP_STATUS_OPTIONS,
    noBlank: true,
  },
  { key: 'ppDate', label: 'PP Date', kind: 'text', editKind: 'date' },
]

// Shown in the chart (and exported) while no PP colour has been ticked yet.
// Independent of PP Status — this says "no colour picked", not "not approved".
export const PP_COLOR_PENDING = 'Pending'

/** Chip tone for a status value: approved reads green, blockers red, rest amber. */
export function statusTone(value: string): 'approved' | 'hold' | 'pending' {
  const s = (value ?? '').trim().toLowerCase()
  // "Not Approved" must not match here, hence the anchor.
  if (/^(appro|ok\b|done|complete|yes)/.test(s)) return 'approved'
  if (/^(hold|reject|cancel)/.test(s)) return 'hold'
  return 'pending'
}

/**
 * PP Status is a two-state flag, so anything that is not recognised as approved
 * — including a blank cell on the imported sheet — reads as "Not Approved".
 */
export function normalizePpStatus(raw: string): string {
  return /^\s*appro/i.test(raw ?? '') ? PP_STATUS_APPROVED : PP_STATUS_NOT_APPROVED
}

/** True when the style's PP has been approved. Drives the PP Approved stat. */
export function isPpApproved(row: PreProdRow): boolean {
  return normalizePpStatus(row.ppStatus) === PP_STATUS_APPROVED
}

// Cell value as a display string.
export function cellText(row: PreProdRow, col: ColumnDef): string {
  const v = row[col.key]
  if (col.key === 'ppColors') {
    const arr = (v as string[]) ?? []
    return arr.length ? arr.join(', ') : PP_COLOR_PENDING
  }
  // Rows imported or saved before this field existed show the default.
  if (col.key === 'ppStatus') return normalizePpStatus(v as string)
  if (Array.isArray(v)) return v.join(', ')
  return (v as string) ?? ''
}
