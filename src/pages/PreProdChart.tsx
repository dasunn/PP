import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Download, Pencil, Trash2, Search, Table2, Columns3 } from 'lucide-react'
import Layout from '../components/Layout'
import AddRowsModal from '../components/AddRowsModal'
import EditRowModal from '../components/EditRowModal'
import ExportDrawer from '../components/ExportDrawer'
import Pagination from '../components/Pagination'
import { useStore } from '../store/store'
import { useToast } from '../components/Toast'
import { COLUMNS, cellText, PP_COLOR_PENDING } from '../lib/columns'
import {
  ACTIONS_COL_WIDTH,
  MIN_COL_WIDTH,
  loadColumnWidths,
  saveColumnWidths,
  type ColumnWidths,
} from '../lib/columnWidths'
import type { PreProdRow } from '../types'

export default function PreProdChart() {
  const { preProdRows, deletePreProdRow } = useStore()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [editRow, setEditRow] = useState<PreProdRow | null>(null)
  const [query, setQuery] = useState('')
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return preProdRows
    return preProdRows.filter((row) =>
      COLUMNS.some((col) => cellText(row, col).toLowerCase().includes(q)),
    )
  }, [preProdRows, query])

  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize))
  // Deleting or filtering can strand the user past the last page.
  const safePage = Math.min(page, totalPages)
  useEffect(() => {
    if (page !== safePage) setPage(safePage)
  }, [page, safePage])

  const visible = useMemo(
    () => (pageSize === 0 ? filtered : filtered.slice((safePage - 1) * pageSize, safePage * pageSize)),
    [filtered, safePage, pageSize],
  )

  function remove(row: PreProdRow) {
    if (window.confirm(`Delete row for global style "${row.globalStyle || '(blank)'}"?`)) {
      deletePreProdRow(row.id)
      toast('Row deleted')
    }
  }

  // ---- Drag-resizable columns ----
  const tableRef = useRef<HTMLTableElement>(null)
  const [widths, setWidths] = useState<ColumnWidths>(() => loadColumnWidths())
  const sized = Object.keys(widths).length > 0

  useEffect(() => {
    saveColumnWidths(widths)
  }, [widths])

  // Total is applied to the table so a fixed layout honours the widths exactly
  // instead of stretching columns to fill the pane.
  const totalWidth = useMemo(
    () =>
      sized
        ? COLUMNS.reduce((sum, c) => sum + (widths[c.key] ?? MIN_COL_WIDTH), 0) + ACTIONS_COL_WIDTH
        : undefined,
    [widths, sized],
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

  function resetWidths() {
    setWidths({})
    toast('Column widths reset')
  }

  return (
    <Layout
      title="Pre-Prod Chart"
      subtitle="One row per global style, generated from the order chart."
      fill={preProdRows.length > 0}
      actions={
        <button
          className="btn btn-primary"
          onClick={() => setExporting(true)}
          disabled={preProdRows.length === 0}
        >
          <Download size={16} />
          Export
        </button>
      }
    >
      <div className="toolbar">
        <div className="left">
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            <Plus size={16} />
            Styles
          </button>
          <span className="count-pill">{preProdRows.length} styles</span>
          {sized && (
            <button className="btn btn-sm btn-ghost" onClick={resetWidths} title="Reset column widths">
              <Columns3 size={15} />
              Reset widths
            </button>
          )}
        </div>
        {preProdRows.length > 0 && (
          <div className="search">
            <Search size={15} />
            <input
              className="input"
              placeholder="Search all fields…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
            />
          </div>
        )}
      </div>

      {preProdRows.length === 0 ? (
        <div className="grid-wrap">
          <div className="empty">
            <div className="empty-ico">
              <Table2 size={30} />
            </div>
            <h3>No Pre-Prod rows yet</h3>
            <p>
              Click <b>+ Styles</b> in the top-left to upload an order chart. Rows are grouped by
              global style automatically.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid-wrap">
          <div className="grid-scroll">
            <table
              ref={tableRef}
              className={`grid${sized ? ' grid-fixed' : ''}`}
              style={totalWidth ? { width: totalWidth } : undefined}
            >
              {sized && (
                <colgroup>
                  {COLUMNS.map((c) => (
                    <col key={c.key} style={{ width: widths[c.key] }} />
                  ))}
                  <col style={{ width: ACTIONS_COL_WIDTH }} />
                </colgroup>
              )}
              <thead>
                <tr>
                  {COLUMNS.map((c) => (
                    <th key={c.key} data-col={c.key}>
                      <span className="th-label">{c.label}</span>
                      <span
                        className="col-resizer"
                        onPointerDown={(e) => startResize(e, c.key)}
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={`Resize ${c.label} column`}
                        title="Drag to resize"
                      />
                    </th>
                  ))}
                  <th className="col-sticky" style={{ textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id}>
                    {COLUMNS.map((col) => (
                      <td key={col.key} title={cellText(row, col)}>
                        {renderCell(row, col.key, col.kind)}
                      </td>
                    ))}
                    <td className="col-sticky">
                      <div className="row-actions">
                        <button
                          className="btn icon-btn btn-ghost btn-sm"
                          onClick={() => setEditRow(row)}
                          aria-label="Edit"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="btn icon-btn btn-danger btn-sm"
                          onClick={() => remove(row)}
                          aria-label="Delete"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} style={{ textAlign: 'center', padding: 30 }}>
                      No rows match “{query}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            total={filtered.length}
            page={safePage}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={(size) => {
              setPageSize(size)
              setPage(1)
            }}
            noun="styles"
          />
        </div>
      )}

      {adding && <AddRowsModal onClose={() => setAdding(false)} />}
      {exporting && <ExportDrawer onClose={() => setExporting(false)} />}
      {editRow && <EditRowModal row={editRow} onClose={() => setEditRow(null)} />}
    </Layout>
  )
}

function renderCell(row: PreProdRow, key: keyof PreProdRow, kind: 'text' | 'chips') {
  if (kind === 'chips') {
    const arr = row[key] as string[]
    // PP colour stays "Pending" until one of the order-chart colours is ticked.
    if (key === 'ppColors' && (!arr || arr.length === 0)) {
      return <span className="chip chip-pending">{PP_COLOR_PENDING}</span>
    }
    if (!arr || arr.length === 0) return <span className="empty-cell">—</span>
    const cls = key === 'destinations' ? 'chip chip-plain' : 'chip'
    return (
      <div className="chips">
        {arr.map((v, i) => (
          <span key={i} className={cls}>
            {v}
          </span>
        ))}
      </div>
    )
  }
  const val = row[key] as string
  return val ? val : <span className="empty-cell">—</span>
}
