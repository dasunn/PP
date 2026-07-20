import { useMemo, useState } from 'react'
import { Plus, Download, Pencil, Trash2, Search, Table2 } from 'lucide-react'
import Layout from '../components/Layout'
import AddRowsModal from '../components/AddRowsModal'
import EditRowModal from '../components/EditRowModal'
import ExportDrawer from '../components/ExportDrawer'
import { useStore } from '../store/store'
import { useToast } from '../components/Toast'
import { COLUMNS, cellText } from '../lib/columns'
import type { PreProdRow } from '../types'

export default function PreProdChart() {
  const { preProdRows, deletePreProdRow } = useStore()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [editRow, setEditRow] = useState<PreProdRow | null>(null)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return preProdRows
    return preProdRows.filter((row) =>
      COLUMNS.some((col) => cellText(row, col).toLowerCase().includes(q)),
    )
  }, [preProdRows, query])

  function remove(row: PreProdRow) {
    if (window.confirm(`Delete row for global style "${row.globalStyle || '(blank)'}"?`)) {
      deletePreProdRow(row.id)
      toast('Row deleted')
    }
  }

  return (
    <Layout
      title="Pre-Prod Chart"
      subtitle="One row per global style, generated from the order chart."
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
            Add rows
          </button>
          <span className="count-pill">{preProdRows.length} styles</span>
        </div>
        {preProdRows.length > 0 && (
          <div className="search">
            <Search size={15} />
            <input
              className="input"
              placeholder="Search all fields…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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
              Click <b>Add rows</b> in the top-left to upload an order chart. Rows are grouped by
              global style automatically.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid-wrap">
          <div className="grid-scroll">
            <table className="grid">
              <thead>
                <tr>
                  {COLUMNS.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                  <th className="col-sticky" style={{ textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    {COLUMNS.map((col) => (
                      <td key={col.key}>{renderCell(row, col.key, col.kind)}</td>
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
