// Persisted drag-resized widths for the data grids, keyed by column.

// Each grid keeps its own set of widths under its own storage key.
export const PREPROD_WIDTHS_KEY = 'preprod-column-widths-v1'
export const MATERIAL_WIDTHS_KEY = 'material-column-widths-v1'

export type ColumnWidths = Record<string, number>

// Narrow enough to be useful, wide enough to still grab the handle.
export const MIN_COL_WIDTH = 70
// The pinned Actions column holds three icon buttons; it is not resizable.
export const ACTIONS_COL_WIDTH = 126

export function loadColumnWidths(storageKey: string): ColumnWidths {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ColumnWidths
    // Drop anything that isn't a usable number (stale keys, hand-edited storage).
    return Object.fromEntries(
      Object.entries(parsed).filter(([, w]) => typeof w === 'number' && w >= MIN_COL_WIDTH),
    )
  } catch {
    return {}
  }
}

export function saveColumnWidths(widths: ColumnWidths, storageKey: string): void {
  try {
    if (Object.keys(widths).length === 0) localStorage.removeItem(storageKey)
    else localStorage.setItem(storageKey, JSON.stringify(widths))
  } catch {
    // Storage unavailable (private mode / quota) — resizing still works for the session.
  }
}
