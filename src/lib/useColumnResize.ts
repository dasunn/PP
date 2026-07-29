import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  MIN_COL_WIDTH,
  loadColumnWidths,
  saveColumnWidths,
  type ColumnWidths,
} from './columnWidths'

/**
 * Drag-to-resize behaviour shared by the data grids. The table stays on its
 * natural layout until the first drag; from then on widths come from a
 * <colgroup> and are persisted per grid.
 *
 * `columnKeys` must be referentially stable (module constant or memo).
 * `extraWidth` covers non-resizable columns such as the pinned Actions cell.
 */
export function useColumnResize(storageKey: string, columnKeys: string[], extraWidth = 0) {
  const tableRef = useRef<HTMLTableElement>(null)
  const [widths, setWidths] = useState<ColumnWidths>(() => loadColumnWidths(storageKey))
  const sized = Object.keys(widths).length > 0

  useEffect(() => {
    saveColumnWidths(widths, storageKey)
  }, [widths, storageKey])

  // Total is applied to the table so a fixed layout honours the widths exactly
  // instead of stretching columns to fill the pane.
  const totalWidth = useMemo(
    () =>
      sized
        ? columnKeys.reduce((sum, key) => sum + (widths[key] ?? MIN_COL_WIDTH), 0) + extraWidth
        : undefined,
    [widths, sized, columnKeys, extraWidth],
  )

  const startResize = useCallback(
    (e: React.PointerEvent<HTMLElement>, key: string) => {
      e.preventDefault()
      e.stopPropagation()
      const table = tableRef.current
      if (!table) return

      // First drag: freeze every column at the width it is rendering at, so
      // switching to a fixed layout doesn't reshuffle the other columns.
      const base: ColumnWidths = { ...widths }
      table.querySelectorAll<HTMLTableCellElement>('thead th[data-col]').forEach((th) => {
        const k = th.dataset.col
        if (k && base[k] == null) {
          base[k] = Math.max(MIN_COL_WIDTH, Math.round(th.getBoundingClientRect().width))
        }
      })
      setWidths(base)

      const startX = e.clientX
      const startWidth = base[key] ?? MIN_COL_WIDTH

      const onMove = (ev: PointerEvent) => {
        const next = Math.max(MIN_COL_WIDTH, Math.round(startWidth + ev.clientX - startX))
        setWidths((w) => ({ ...w, [key]: next }))
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
        document.body.classList.remove('resizing-col')
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
      document.body.classList.add('resizing-col')
    },
    [widths],
  )

  const resetWidths = useCallback(() => setWidths({}), [])

  return { tableRef, widths, sized, totalWidth, startResize, resetWidths }
}
