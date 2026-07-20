import { useState } from 'react'
import Modal from './Modal'
import { useStore } from '../store/store'
import { useToast } from './Toast'
import { COLUMNS } from '../lib/columns'
import type { PreProdRow } from '../types'

interface Props {
  row: PreProdRow
  onClose: () => void
}

function toMulti(s: string): string[] {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

export default function EditRowModal({ row, onClose }: Props) {
  const { updatePreProdRow, merchants } = useStore()
  const toast = useToast()
  const [draft, setDraft] = useState<PreProdRow>({ ...row })

  function setText(key: keyof PreProdRow, value: string) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function save() {
    updatePreProdRow(draft)
    toast('Row updated')
    onClose()
  }

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
        {COLUMNS.map((col) => {
          const isChips = col.kind === 'chips'
          const value = isChips
            ? (draft[col.key] as string[]).join(', ')
            : (draft[col.key] as string)

          // Merchant becomes a dropdown for convenience.
          if (col.key === 'merchant') {
            return (
              <div className="field" key={col.key}>
                <label>{col.label}</label>
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
              </div>
            )
          }

          return (
            <div className="field" key={col.key}>
              <label>
                {col.label}
                {col.manual && <span className="hint" style={{ display: 'inline', marginLeft: 6 }}>manual</span>}
              </label>
              <input
                className="input"
                value={value}
                placeholder={isChips ? 'Comma separated' : ''}
                onChange={(e) =>
                  isChips
                    ? setDraft((d) => ({ ...d, [col.key]: toMulti(e.target.value) }))
                    : setText(col.key, e.target.value)
                }
              />
              {isChips && <p className="hint">Separate multiple values with commas.</p>}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
