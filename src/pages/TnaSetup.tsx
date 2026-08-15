import { useState } from 'react'
import { Plus, Pencil, Trash2, CalendarOff, RotateCcw, ArrowRight } from 'lucide-react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import { useStore } from '../store/store'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/Confirm'
import {
  TNA_INTERVALS,
  WORK_WEEK_OPTIONS,
  formatDate,
  toDateInput,
  totalDays,
} from '../lib/tna'
import type { Holiday } from '../types'

type Tab = 'intervals' | 'workweek' | 'holidays'

const blankHoliday = { date: '', note: '' }

// Monday-first display order for the day chips — getDay() itself is Sun-first.
const WEEK_DAYS = [
  { idx: 1, label: 'M' },
  { idx: 2, label: 'T' },
  { idx: 3, label: 'W' },
  { idx: 4, label: 'T' },
  { idx: 5, label: 'F' },
  { idx: 6, label: 'S' },
  { idx: 0, label: 'S' },
]

export default function TnaSetup() {
  const [tab, setTab] = useState<Tab>('intervals')
  const {
    tnaIntervalDays,
    holidays,
    workWeek,
    setIntervalDays,
    clearIntervalDays,
    setWorkWeek,
    addHoliday,
    updateHoliday,
    deleteHoliday,
  } = useStore()
  const toast = useToast()
  const confirm = useConfirm()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Holiday | null>(null)
  const [form, setForm] = useState(blankHoliday)
  const [error, setError] = useState('')

  function startAdd() {
    setEditing(null)
    setForm({ date: toDateInput(new Date()), note: '' })
    setError('')
    setOpen(true)
  }

  function startEdit(h: Holiday) {
    setEditing(h)
    setForm({ date: h.date, note: h.note })
    setError('')
    setOpen(true)
  }

  function saveHoliday() {
    if (!form.date) return setError('Pick a date.')
    const clash = holidays.some((h) => h.date === form.date && h.id !== editing?.id)
    if (clash) return setError('That date is already marked as a holiday.')

    if (editing) {
      updateHoliday({ ...editing, date: form.date, note: form.note.trim() })
      toast('Holiday updated')
    } else {
      addHoliday({ date: form.date, note: form.note.trim() })
      toast('Holiday added')
    }
    setOpen(false)
  }

  async function removeHoliday(h: Holiday) {
    const ok = await confirm({
      title: 'Remove this holiday?',
      message: (
        <>
          <b>{formatDate(h.date)}</b> will count as a working day again, and every T&amp;A plan
          date is recalculated.
        </>
      ),
      confirmLabel: 'Remove holiday',
      danger: true,
    })
    if (!ok) return
    deleteHoliday(h.id)
    toast('Holiday deleted')
  }

  async function resetDays() {
    const ok = await confirm({
      title: 'Clear every interval?',
      message: `All ${filled} interval day count${filled === 1 ? '' : 's'} will be cleared, which leaves every T&A plan date blank until they are filled in again.`,
      confirmLabel: 'Clear intervals',
      danger: true,
    })
    if (!ok) return
    clearIntervalDays()
    toast('Intervals cleared')
  }

  // Blank clears the value; anything else is clamped to a non-negative whole number.
  function onDaysChange(key: string, raw: string) {
    if (raw.trim() === '') return setIntervalDays(key, null)
    const n = Number(raw)
    if (!Number.isFinite(n)) return
    setIntervalDays(key, Math.max(0, Math.round(n)))
  }

  const filled = TNA_INTERVALS.filter((i) => tnaIntervalDays[i.key] !== undefined).length

  return (
    <Layout
      title="T&A Setup"
      subtitle="Lead times and non-working dates used to build the T&A plan."
      actions={
        tab === 'intervals' ? (
          <button className="btn" onClick={resetDays} disabled={filled === 0}>
            <RotateCcw size={16} />
            Reset days
          </button>
        ) : tab === 'holidays' ? (
          <button className="btn btn-primary" onClick={startAdd}>
            <Plus size={16} />
            Add holiday
          </button>
        ) : undefined
      }
    >
      <div className="tabs">
        <button
          className={`tab${tab === 'intervals' ? ' active' : ''}`}
          onClick={() => setTab('intervals')}
        >
          Time Intervals
          <span className="tab-count">{filled}/{TNA_INTERVALS.length}</span>
        </button>
        <button
          className={`tab${tab === 'workweek' ? ' active' : ''}`}
          onClick={() => setTab('workweek')}
        >
          Work Week
        </button>
        <button
          className={`tab${tab === 'holidays' ? ' active' : ''}`}
          onClick={() => setTab('holidays')}
        >
          Holidays
          <span className="tab-count">{holidays.length}</span>
        </button>
      </div>

      {tab === 'intervals' ? (
        <div className="grid-wrap">
          <div className="grid-scroll">
            <table className="grid">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>#</th>
                  <th>From</th>
                  <th>To</th>
                  <th style={{ width: 180 }}>No of Days</th>
                </tr>
              </thead>
              <tbody>
                {TNA_INTERVALS.map((iv, idx) => (
                  <tr key={iv.key}>
                    <td className="muted-cell">{idx + 1}</td>
                    <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{iv.from}</td>
                    <td>
                      <span className="flow-to">
                        <ArrowRight size={13} />
                        {iv.to}
                      </span>
                    </td>
                    <td>
                      <input
                        className="input days-input"
                        type="number"
                        min={0}
                        step={1}
                        placeholder="—"
                        value={tnaIntervalDays[iv.key] ?? ''}
                        onChange={(e) => onDaysChange(iv.key, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>
                    Total lead time
                  </td>
                  <td style={{ fontWeight: 800, color: 'var(--primary-dark)' }}>
                    {totalDays(tnaIntervalDays)} days
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : tab === 'workweek' ? (
        <div className="card card-pad">
          <p className="hint" style={{ marginTop: 0, marginBottom: 16 }}>
            Pick which days are worked. Plan dates step backwards from PP Date one day at a
            time, skipping non-working days here plus anything on the Holidays tab.
          </p>
          <div className="workweek-options">
            {WORK_WEEK_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={`workweek-option${workWeek === opt.key ? ' active' : ''}`}
                onClick={() => setWorkWeek(opt.key)}
              >
                <span className="workweek-radio">
                  <i />
                </span>
                <span className="workweek-body">
                  <b>{opt.label}</b>
                  <p>{opt.desc}</p>
                </span>
                <span className="workweek-days">
                  {WEEK_DAYS.map((d, i) => (
                    <span
                      key={i}
                      className={`wd-chip${opt.off.includes(d.idx) ? ' off' : ''}`}
                    >
                      {d.label}
                    </span>
                  ))}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid-wrap">
          {holidays.length === 0 ? (
            <div className="empty">
              <div className="empty-ico">
                <CalendarOff size={30} />
              </div>
              <h3>No holidays yet</h3>
              <p>Add the non-working dates so plan dates skip over them.</p>
            </div>
          ) : (
            <div className="grid-scroll">
              <table className="grid">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>#</th>
                    <th>Date</th>
                    <th>Note</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.map((h, idx) => (
                    <tr key={h.id}>
                      <td className="muted-cell">{idx + 1}</td>
                      <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{formatDate(h.date)}</td>
                      <td>{h.note || <span className="empty-cell">—</span>}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="btn icon-btn btn-ghost btn-sm"
                            onClick={() => startEdit(h)}
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="btn icon-btn btn-danger btn-sm"
                            onClick={() => removeHoliday(h)}
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {open && (
        <Modal
          title={editing ? 'Edit holiday' : 'Add holiday'}
          subtitle="Non-working date — excluded when plan dates are calculated."
          onClose={() => setOpen(false)}
          maxWidth={440}
          footer={
            <>
              <button className="btn" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveHoliday}>
                {editing ? 'Save changes' : 'Add holiday'}
              </button>
            </>
          }
        >
          <div className="field">
            <label>
              Date <span className="req">*</span>
            </label>
            <input
              className="input"
              type="date"
              autoFocus
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Note</label>
            <input
              className="input"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="e.g. Poya day, factory shutdown"
            />
          </div>
          {error && (
            <p style={{ color: 'var(--danger)', fontSize: 12.5, fontWeight: 600, margin: 0 }}>{error}</p>
          )}
        </Modal>
      )}
    </Layout>
  )
}
