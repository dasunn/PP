import { useMemo, useState } from 'react'
import Drawer from './Drawer'
import Spinner from './Spinner'
import { useStore } from '../store/store'
import { useToast } from './Toast'
import { COLUMNS, cellText } from '../lib/columns'
import { exportPreProd, yieldToPaint } from '../lib/excel'
import { styleKey } from '../lib/materials'
import type { PreProdRow } from '../types'

interface Props {
  onClose: () => void
}

export default function ExportDrawer({ onClose }: Props) {
  const { preProdRows, materials, merchants, addHistory } = useStore()
  const toast = useToast()
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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

  // The Materials tab carries only the lines belonging to the exported styles.
  const matchedMaterials = useMemo(() => {
    const styles = new Set(matched.map((r) => styleKey(r.m3Style)).filter(Boolean))
    return materials.filter((m) => styles.has(styleKey(m.style)))
  }, [materials, matched])

  async function doExport() {
    const stamp = new Date().toISOString().slice(0, 10)
    const fileName = `preprod-chart_${stamp}.xlsx`

    setBusy(true)
    setError('')
    try {
      // Building and writing the workbook is synchronous and can block for a
      // while on a large chart, so let the spinner reach the screen first.
      await yieldToPaint()
      exportPreProd(matched, matchedMaterials, fileName)
      addHistory({ type: 'export', fileName, rows: matched.length })
      toast(
        `Exported ${matched.length} row${matched.length === 1 ? '' : 's'}` +
          (matchedMaterials.length ? ` · ${matchedMaterials.length} material lines` : ''),
      )
      onClose()
    } catch {
      setBusy(false)
      setError('Could not build the Excel file. Please try again.')
    }
  }

  return (
    <Drawer
      title="Export Pre-Prod chart"
      subtitle="Apply filters, then export the matching rows to Excel."
      onClose={onClose}
      footer={
        <>
          <button
            className="btn"
            style={{ flex: 1 }}
            onClick={() => setFilters({})}
            disabled={busy}
          >
            Reset
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 2 }}
            onClick={doExport}
            disabled={matched.length === 0 || busy}
          >
            {busy && <Spinner />}
            {busy
              ? 'Building file…'
              : `Export ${matched.length} row${matched.length === 1 ? '' : 's'} (.xlsx)`}
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
      <p className="hint" style={{ marginTop: -10, marginBottom: 18 }}>
        {matchedMaterials.length > 0
          ? `${matchedMaterials.length} material line${
              matchedMaterials.length === 1 ? '' : 's'
            } will be written to a separate “Materials” tab.`
          : 'No material details match these rows — the Materials tab will be empty.'}
      </p>

      {error && (
        <p style={{ color: 'var(--danger)', fontSize: 12.5, fontWeight: 600, marginTop: 0 }}>
          {error}
        </p>
      )}

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
