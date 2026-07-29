// Persisted drag-resized widths for the Pre-Prod grid, keyed by column.

const STORAGE_KEY = 'preprod-column-widths-v1'

export type ColumnWidths = Record<string, number>

// Narrow enough to be useful, wide enough to still grab the handle.
export const MIN_COL_WIDTH = 70
// The pinned Actions column holds two icon buttons; it is not resizable.
export const ACTIONS_COL_WIDTH = 92

export function loadColumnWidths(): ColumnWidths {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
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

export function saveColumnWidths(widths: ColumnWidths): void {
  try {
    if (Object.keys(widths).length === 0) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(widths))
  } catch {
    // Storage unavailable (private mode / quota) — resizing still works for the session.
  }
}
