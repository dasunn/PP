import { useEffect, useMemo, useState } from 'react'
import { Plus, Download, Pencil, Trash2, Search, Table2, Columns3, ListTree } from 'lucide-react'
import Layout from '../components/Layout'
import AddRowsModal from '../components/AddRowsModal'
import AddMaterialsModal from '../components/AddMaterialsModal'
import EditRowModal from '../components/EditRowModal'
import MaterialDetailsModal from '../components/MaterialDetailsModal'
import ExportDrawer from '../components/ExportDrawer'
import Pagination from '../components/Pagination'
import { useStore } from '../store/store'
import { useToast } from '../components/Toast'
import { COLUMNS, cellText, PP_COLOR_PENDING } from '../lib/columns'
import { groupMaterialsByStyle, styleKey } from '../lib/materials'
import { ACTIONS_COL_WIDTH, PREPROD_WIDTHS_KEY } from '../lib/columnWidths'
import { useColumnResize } from '../lib/useColumnResize'
import type { PreProdRow } from '../types'

// Stable identity for the resize hook.
const PREPROD_COL_KEYS = COLUMNS.map((c) => c.key as string)

export default function PreProdChart() {
  const { preProdRows, materials, deletePreProdRow } = useStore()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [addingMaterials, setAddingMaterials] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [editRow, setEditRow] = useState<PreProdRow | null>(null)
  const [detailRow, setDetailRow] = useState<PreProdRow | null>(null)
  const [query, setQuery] = useState('')
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)

  // Material lines keyed by style, so each row can show how many it carries.
  const materialsByStyle = useMemo(() => groupMaterialsByStyle(materials), [materials])

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
  const { tableRef, widths, sized, totalWidth, startResize, resetWidths } = useColumnResize(
    PREPROD_WIDTHS_KEY,
    PREPROD_COL_KEYS,
    ACTIONS_COL_WIDTH,
  )

  function handleResetWidths() {
    resetWidths()
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
          <button
            className="btn"
            onClick={() => setAddingMaterials(true)}
            title="Upload material details (Data tab)"
          >
            <Plus size={16} />
            Materials
          </button>
          <span className="count-pill">{preProdRows.length} styles</span>
          {materials.length > 0 && (
            <span className="count-pill">{materials.length} material lines</span>
          )}
          {sized && (
            <button className="btn btn-sm btn-ghost" onClick={handleResetWidths} title="Reset column widths">
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
                {visible.map((row) => {
                  const matCount = materialsByStyle.get(styleKey(row.m3Style))?.length ?? 0
                  return (
                  <tr key={row.id}>
                    {COLUMNS.map((col) => (
                      <td key={col.key} title={cellText(row, col)}>
                        {renderCell(row, col.key, col.kind)}
                      </td>
                    ))}
                    <td className="col-sticky">
                      <div className="row-actions">
                        <button
                          className={`btn icon-btn btn-ghost btn-sm${matCount ? ' has-materials' : ''}`}
                          onClick={() => setDetailRow(row)}
                          aria-label="Material details"
                          title={
                            matCount
                              ? `Material details (${matCount} line${matCount === 1 ? '' : 's'})`
                              : 'Material details — none imported'
                          }
                        >
                          <ListTree size={15} />
                        </button>
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
                  )
                })}
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
      {addingMaterials && <AddMaterialsModal onClose={() => setAddingMaterials(false)} />}
      {exporting && <ExportDrawer onClose={() => setExporting(false)} />}
      {editRow && <EditRowModal row={editRow} onClose={() => setEditRow(null)} />}
      {detailRow && (
        <MaterialDetailsModal row={detailRow} onClose={() => setDetailRow(null)} />
      )}
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
