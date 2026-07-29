import { useMemo, useState } from 'react'
import { Columns3, PackageSearch, Search } from 'lucide-react'
import Modal from './Modal'
import { useStore } from '../store/store'
import {
  MATERIAL_COLUMNS,
  materialCellText,
  styleKey,
} from '../lib/materials'
import { MATERIAL_WIDTHS_KEY } from '../lib/columnWidths'
import { useColumnResize } from '../lib/useColumnResize'
import type { PreProdRow } from '../types'

interface Props {
  row: PreProdRow
  onClose: () => void
}

// Stable identity for the resize hook.
const MATERIAL_COL_KEYS = MATERIAL_COLUMNS.map((c) => c.key as string)
// The non-resizable line-number column.
const ROWNUM_WIDTH = 44

export default function MaterialDetailsModal({ row, onClose }: Props) {
  const { materials } = useStore()
  const [query, setQuery] = useState('')

  const key = styleKey(row.m3Style)
  const styleMaterials = useMemo(
    () => (key ? materials.filter((m) => styleKey(m.style) === key) : []),
    [materials, key],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return styleMaterials
    return styleMaterials.filter((m) =>
      MATERIAL_COLUMNS.some((col) => materialCellText(m, col).toLowerCase().includes(q)),
    )
  }, [styleMaterials, query])

  const { tableRef, widths, sized, totalWidth, startResize, resetWidths } = useColumnResize(
    MATERIAL_WIDTHS_KEY,
    MATERIAL_COL_KEYS,
    ROWNUM_WIDTH,
  )

  return (
    <Modal
      title="Material details"
      subtitle={`M3 Style ${row.m3Style || '—'}${
        row.styleDescription ? ` · ${row.styleDescription}` : ''
      }`}
      className="modal-erp"
      maxWidth={1040}
      onClose={onClose}
      footer={
        <button className="btn btn-primary" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="erp-toolbar">
        <div className="erp-meta">
          <span>
            Global Style <b>{row.globalStyle || '—'}</b>
          </span>
          <span>
            Inquiry No <b>{row.inquiryNo || '—'}</b>
          </span>
          <span>
            Lines <b>{filtered.length}</b>
            {filtered.length !== styleMaterials.length && ` of ${styleMaterials.length}`}
          </span>
        </div>
        <div className="erp-tools">
          {sized && (
            <button className="btn btn-sm btn-ghost" onClick={resetWidths} title="Reset column widths">
              <Columns3 size={15} />
              Reset widths
            </button>
          )}
          {styleMaterials.length > 0 && (
            <div className="search">
              <Search size={15} />
              <input
                className="input"
                placeholder="Search materials…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {styleMaterials.length === 0 ? (
        <div className="erp-grid-wrap">
          <div className="erp-empty">
            <PackageSearch size={26} />
            <b>No material details for this style</b>
            <p>
              {row.m3Style
                ? `Nothing was imported for M3 Style “${row.m3Style}”. Use + Materials to upload the Data tab.`
                : 'This row has no M3 Style, so material lines cannot be matched to it.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="erp-grid-wrap">
          <div className="erp-scroll">
            <table
              ref={tableRef}
              className={`erp-grid${sized ? ' erp-fixed' : ''}`}
              style={totalWidth ? { width: totalWidth } : undefined}
            >
              {sized && (
                <colgroup>
                  <col style={{ width: ROWNUM_WIDTH }} />
                  {MATERIAL_COLUMNS.map((c) => (
                    <col key={c.key} style={{ width: widths[c.key] }} />
                  ))}
                </colgroup>
              )}
              <thead>
                <tr>
                  <th className="erp-rownum">#</th>
                  {MATERIAL_COLUMNS.map((c) => (
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
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={m.id}>
                    <td className="erp-rownum">{i + 1}</td>
                    {MATERIAL_COLUMNS.map((col) => {
                      const text = materialCellText(m, col)
                      return (
                        <td key={col.key} title={text}>
                          {text || <span className="empty-cell">—</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={MATERIAL_COLUMNS.length + 1}
                      style={{ textAlign: 'center', padding: 24 }}
                    >
                      No material lines match “{query}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  )
}
