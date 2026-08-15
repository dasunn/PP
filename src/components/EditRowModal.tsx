import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import Modal from './Modal'
import { useStore } from '../store/store'
import { useToast } from './Toast'
import { COLUMNS, normalizePpStatus, type ColumnDef } from '../lib/columns'
import { toISODate } from '../lib/preprod'
import type { PreProdRow } from '../types'

interface Props {
  row: PreProdRow
  onClose: () => void
}

// One line of the PP-colour grid: the colour, and whether it is the PP colour.
interface ColorLine {
  name: string
  pp: boolean
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export default function EditRowModal({ row, onClose }: Props) {
  const { updatePreProdRow, merchants } = useStore()
  const toast = useToast()
  // PP Status is a fixed two-state field, so an imported blank / unrecognised
  // value is settled up front — the dropdown then always shows what is stored.
  const [draft, setDraft] = useState<PreProdRow>(() => ({
    ...row,
    ppStatus: normalizePpStatus(row.ppStatus),
  }))

  // Destination + PP colour are edited as their own grids below the form.
  const [destinations, setDestinations] = useState<string[]>(() =>
    row.destinations.length ? [...row.destinations] : [''],
  )
  const [colors, setColors] = useState<ColorLine[]>(() => {
    const options = row.colorOptions?.length ? row.colorOptions : row.ppColors
    const lines = options.map((name) => ({ name, pp: row.ppColors.includes(name) }))
    return lines.length ? lines : [{ name: '', pp: false }]
  })

  function setText(key: keyof PreProdRow, value: string) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function setDestination(index: number, value: string) {
    setDestinations((list) => list.map((v, i) => (i === index ? value : v)))
  }

  function setColor(index: number, patch: Partial<ColorLine>) {
    setColors((list) => list.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  function save() {
    const cleanDestinations = destinations.map((d) => d.trim()).filter(Boolean)
    const cleanColors = colors
      .map((c) => ({ ...c, name: c.name.trim() }))
      .filter((c) => c.name)

    updatePreProdRow({
      ...draft,
      destinations: cleanDestinations,
      colorOptions: cleanColors.map((c) => c.name),
      ppColors: cleanColors.filter((c) => c.pp).map((c) => c.name),
    })
    toast('Row updated')
    onClose()
  }

  function renderField(col: ColumnDef) {
    const value = (draft[col.key] as string) ?? ''

    if (col.editKind === 'merchant') {
      return (
        <select
          className="select"
          value={value}
          onChange={(e) => setText(col.key, e.target.value)}
        >
          <option value="">—</option>
          {merchants.map((m) => (
            <option key={m.id} value={m.fullName}>
              {m.fullName}
            </option>
          ))}
          {value && !merchants.some((m) => m.fullName === value) && (
            <option value={value}>{value}</option>
          )}
        </select>
      )
    }

    if (col.editKind === 'select') {
      const options = col.options ?? []
      // Keep an unrecognised imported value selectable so editing never drops it.
      // A `noBlank` field is normalised into `draft`, so it always matches one.
      const extra = !col.noBlank && value && !options.includes(value) ? value : null
      return (
        <select
          className="select"
          value={value}
          onChange={(e) => setText(col.key, e.target.value)}
        >
          {!col.noBlank && <option value="">—</option>}
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
          {extra && <option value={extra}>{extra}</option>}
        </select>
      )
    }

    if (col.editKind === 'date') {
      const iso = toISODate(value)
      const valid = ISO_DATE.test(iso)
      return (
        <>
          <input
            className="input"
            type="date"
            value={valid ? iso : ''}
            onChange={(e) => setText(col.key, e.target.value)}
          />
          {!valid && value && (
            <p className="hint">Imported as “{value}” — pick a date to replace it.</p>
          )}
        </>
      )
    }

    return (
      <input className="input" value={value} onChange={(e) => setText(col.key, e.target.value)} />
    )
  }

  // Ticked but unnamed colours are dropped on save — warn instead of silently losing them.
  const ppTickedWithoutName = colors.some((c) => c.pp && !c.name.trim())

  const formColumns = COLUMNS.filter(
    (c) => c.editKind !== 'list' && c.editKind !== 'colors',
  )
  const destinationLabel = COLUMNS.find((c) => c.editKind === 'list')?.label ?? 'Destination'
  const colorLabel = COLUMNS.find((c) => c.editKind === 'colors')?.label ?? 'PP Color'

  return (
    <Modal
      title="Edit Pre-Prod row"
      subtitle={draft.globalStyle ? `Global style ${draft.globalStyle}` : undefined}
      maxWidth={680}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save}>
            Save changes
          </button>
        </>
      }
    >
      <div className="grid-2">
        {formColumns.map((col) => (
          <div className="field" key={col.key}>
            <label>{col.label}</label>
            {renderField(col)}
          </div>
        ))}
      </div>

      {/* ---- Destination grid ---- */}
      <div className="section-label" style={{ marginTop: 20 }}>
        {destinationLabel}
      </div>
      <div className="mini-grid">
        <div className="mini-grid-row mini-grid-head cols-1">
          <span>Destination</span>
          <span />
        </div>
        {destinations.map((d, i) => (
          <div className="mini-grid-row cols-1" key={i}>
            <input
              className="input"
              value={d}
              placeholder="e.g. Germany"
              onChange={(e) => setDestination(i, e.target.value)}
            />
            <button
              className="btn icon-btn btn-danger btn-sm"
              onClick={() => setDestinations((list) => list.filter((_, x) => x !== i))}
              aria-label="Delete destination"
              title="Delete destination"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {destinations.length === 0 && <p className="hint">No destinations yet.</p>}
      </div>
      <button className="btn btn-sm" onClick={() => setDestinations((l) => [...l, ''])}>
        <Plus size={15} />
        Add destination
      </button>

      {/* ---- PP colour grid ---- */}
      <div className="section-label" style={{ marginTop: 22 }}>
        {colorLabel}
      </div>
      <div className="mini-grid">
        <div className="mini-grid-row mini-grid-head cols-2">
          <span>Color</span>
          <span>PP</span>
          <span />
        </div>
        {colors.map((c, i) => (
          <div className="mini-grid-row cols-2" key={i}>
            <input
              className="input"
              value={c.name}
              placeholder="e.g. Navy"
              onChange={(e) => setColor(i, { name: e.target.value })}
            />
            <label className="mini-check">
              <input
                type="checkbox"
                checked={c.pp}
                onChange={(e) => setColor(i, { pp: e.target.checked })}
                aria-label={`Mark ${c.name || 'colour'} as PP`}
              />
            </label>
            <button
              className="btn icon-btn btn-danger btn-sm"
              onClick={() => setColors((list) => list.filter((_, x) => x !== i))}
              aria-label="Delete colour"
              title="Delete colour"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {colors.length === 0 && <p className="hint">No colours yet.</p>}
      </div>
      <button
        className="btn btn-sm"
        onClick={() => setColors((l) => [...l, { name: '', pp: false }])}
      >
        <Plus size={15} />
        Add color
      </button>
      {ppTickedWithoutName ? (
        // A nameless colour cannot be stored, so saving would quietly discard
        // the tick and leave the chart on "Pending" with no explanation.
        <p className="hint" style={{ color: 'var(--danger)', fontWeight: 600 }}>
          Type a colour name next to the ticked <b>PP</b> box — a colour with no name
          cannot be saved.
        </p>
      ) : (
        <p className="hint">
          Tick the colour that is the PP colour. Until one is ticked the chart shows
          <b> Pending</b>. Approval itself is set by <b>PP Status</b> above.
        </p>
      )}
    </Modal>
  )
}
