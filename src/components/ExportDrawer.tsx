import { useMemo, useState } from 'react'
import Drawer from './Drawer'
import { useStore } from '../store/store'
import { useToast } from './Toast'
import { COLUMNS, cellText } from '../lib/columns'
import { exportPreProd } from '../lib/excel'
import type { PreProdRow } from '../types'

interface Props {
  onClose: () => void
}

export default function ExportDrawer({ onClose }: Props) {
  const { preProdRows, merchants, addHistory } = useStore()
  const toast = useToast()
  const [filters, setFilters] = useState<Record<string, string>>({})

  function setFilter(key: string, value: string) {
    setFilters((f) => ({ ...f, [key]: value }))
  }

  const matched: PreProdRow[] = useMemo(() => {
    return preProdRows.filter((row) =>
      COLUMNS.every((col) => {
        const q = (filters[col.key] ?? '').trim().toLowerCase()
        if (!q) return true
        return cellText(row, col).toLowerCase().includes(q)
      }),
    )
  }, [preProdRows, filters])

  const activeFilters = Object.values(filters).filter((v) => v.trim()).length

  function doExport() {
    const stamp = new Date().toISOString().slice(0, 10)
    const fileName = `preprod-chart_${stamp}.xlsx`
    exportPreProd(matched, fileName)
    addHistory({ type: 'export', fileName, rows: matched.length })
    toast(`Exported ${matched.length} row${matched.length === 1 ? '' : 's'}`)
    onClose()
  }

  return (
    <Drawer
      title="Export Pre-Prod chart"
      subtitle="Apply filters, then export the matching rows to Excel."
      onClose={onClose}
      footer={
        <>
          <button className="btn" style={{ flex: 1 }} onClick={() => setFilters({})}>
            Reset
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 2 }}
            onClick={doExport}
            disabled={matched.length === 0}
          >
            Export {matched.length} row{matched.length === 1 ? '' : 's'} (.xlsx)
          </button>
        </>
      }
    >
      <div
        className="count-pill"
        style={{ display: 'inline-block', marginBottom: 18 }}
      >
        {matched.length} of {preProdRows.length} rows match
        {activeFilters > 0 ? ` · ${activeFilters} filter${activeFilters === 1 ? '' : 's'}` : ''}
      </div>

      <div className="section-label">Filter by field</div>

      {COLUMNS.map((col) => {
        // Merchant filter as a dropdown.
        if (col.key === 'merchant') {
          return (
            <div className="field" key={col.key}>
              <label>{col.label}</label>
              <select
                className="select"
                value={filters[col.key] ?? ''}
                onChange={(e) => setFilter(col.key, e.target.value)}
              >
                <option value="">All merchants</option>
                {merchants.map((m) => (
                  <option key={m.id} value={m.fullName}>
                    {m.fullName}
                  </option>
                ))}
              </select>
            </div>
          )
        }
        return (
          <div className="field" key={col.key}>
            <label>{col.label}</label>
            <input
              className="input"
              value={filters[col.key] ?? ''}
              placeholder={col.kind === 'chips' ? 'Contains any…' : 'Contains…'}
              onChange={(e) => setFilter(col.key, e.target.value)}
            />
          </div>
        )
      })}
    </Drawer>
  )
}
