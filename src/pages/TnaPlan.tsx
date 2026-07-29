import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarRange, Search, Settings2 } from 'lucide-react'
import Layout from '../components/Layout'
import Pagination from '../components/Pagination'
import GanttChart from '../components/GanttChart'
import { useStore } from '../store/store'
import {
  PLAN_EVENTS,
  TNA_INTERVALS,
  computePlanDates,
  dayDiff,
  eventStatus,
  formatShort,
  isValidDate,
  STATUS_LABEL,
  type PlanStatus,
} from '../lib/tna'
import type { PreProdRow, TnaPlanCell } from '../types'

type Tab = 'plan' | 'gantt'
type DateField = keyof TnaPlanCell

/** One event of one style, with its calculated plan and captured dates. */
export interface EventState {
  key: string
  label: string
  short: string
  plan: string
  revised: string
  actual: string
  /** Revised plan when entered, otherwise the calculated plan. */
  due: string
  status: PlanStatus
  delay: number | null
}

export interface PlanRow {
  row: PreProdRow
  events: EventState[]
}

const LEGEND: PlanStatus[] = ['notStarted', 'early', 'onTime', 'slight', 'late']

export default function TnaPlan() {
  const [tab, setTab] = useState<Tab>('plan')
  const { preProdRows, tnaIntervalDays, holidays, tnaPlans, setPlanDate } = useStore()
  const [query, setQuery] = useState('')
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)
  const [edit, setEdit] = useState<{ rowId: string; eventKey: string; field: DateField } | null>(null)

  const holidaySet = useMemo(() => new Set(holidays.map((h) => h.date)), [holidays])
  const intervalsSet = TNA_INTERVALS.filter((i) => tnaIntervalDays[i.key] !== undefined).length

  // Plan dates are always derived, so editing the T&A setup reflows every row.
  const planRows: PlanRow[] = useMemo(
    () =>
      preProdRows.map((row) => {
        const plan = computePlanDates(row.ppDate, tnaIntervalDays, holidaySet)
        const cells = tnaPlans[row.id] ?? {}
        const events = PLAN_EVENTS.map((ev) => {
          const planned = plan[ev.key] ?? ''
          const revised = cells[ev.key]?.revised ?? ''
          const actual = cells[ev.key]?.actual ?? ''
          const due = revised || planned
          return {
            key: ev.key,
            label: ev.label,
            short: ev.short,
            plan: planned,
            revised,
            actual,
            due,
            status: eventStatus(due, actual),
            delay: due && actual ? dayDiff(due, actual) : null,
          }
        })
        return { row, events }
      }),
    [preProdRows, tnaIntervalDays, holidaySet, tnaPlans],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return planRows
    return planRows.filter(({ row }) =>
      [row.globalStyle, row.season, row.inquiryNo, row.m3Style, row.styleDescription].some((v) =>
        (v ?? '').toLowerCase().includes(q),
      ),
    )
  }, [planRows, query])

  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  useEffect(() => {
    if (page !== safePage) setPage(safePage)
  }, [page, safePage])

  const visible = useMemo(
    () =>
      pageSize === 0 ? filtered : filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  )

  function commit(rowId: string, eventKey: string, field: DateField, value: string) {
    setPlanDate(rowId, eventKey, field, value)
  }

  const editable = (rowId: string, eventKey: string, field: DateField, value: string) => {
    const isEditing =
      edit?.rowId === rowId && edit.eventKey === eventKey && edit.field === field
    if (isEditing) {
      return (
        <input
          className="input cell-date"
          type="date"
          autoFocus
          defaultValue={value}
          onChange={(e) => commit(rowId, eventKey, field, e.target.value)}
          onBlur={() => setEdit(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') setEdit(null)
          }}
        />
      )
    }
    return (
      <button
        className="cell-btn"
        onClick={() => setEdit({ rowId, eventKey, field })}
        title="Click to pick a date"
      >
        {value ? formatShort(value) : <span className="empty-cell">—</span>}
      </button>
    )
  }

  return (
    <Layout
      title="T&A Plan"
      subtitle="Backward plan per style, calculated from PP Date using the T&A setup."
      fill={preProdRows.length > 0}
      actions={
        <Link className="btn" to="/tna-setup">
          <Settings2 size={16} />
          T&A Setup
        </Link>
      }
    >
      <div className="tabs">
        <button className={`tab${tab === 'plan' ? ' active' : ''}`} onClick={() => setTab('plan')}>
          Plan
          <span className="tab-count">{filtered.length}</span>
        </button>
        <button className={`tab${tab === 'gantt' ? ' active' : ''}`} onClick={() => setTab('gantt')}>
          Gantt chart
        </button>
      </div>

      <div className="toolbar">
        <div className="left">
          <span className="count-pill">{preProdRows.length} styles</span>
          <div className="legend">
            {LEGEND.map((s) => (
              <span key={s} className="legend-item">
                <i className={`swatch st-${s}`} />
                {STATUS_LABEL[s]}
              </span>
            ))}
          </div>
        </div>
        {preProdRows.length > 0 && (
          <div className="search">
            <Search size={15} />
            <input
              className="input"
              placeholder="Search styles…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
            />
          </div>
        )}
      </div>

      {intervalsSet < TNA_INTERVALS.length && preProdRows.length > 0 && (
        <div className="notice">
          <b>
            {intervalsSet} of {TNA_INTERVALS.length} intervals set.
          </b>{' '}
          Plan dates are calculated backwards from PP Date, so an interval without a day count
          stops the chain — fill them in on <Link to="/tna-setup">T&A Setup → Time Intervals</Link>.
        </div>
      )}

      {preProdRows.length === 0 ? (
        <div className="grid-wrap">
          <div className="empty">
            <div className="empty-ico">
              <CalendarRange size={30} />
            </div>
            <h3>No styles to plan yet</h3>
            <p>
              Upload an order chart on the <b>Pre-Prod Chart</b> page — every style there gets a
              T&A plan here.
            </p>
          </div>
        </div>
      ) : tab === 'plan' ? (
        <div className="erp-grid-wrap tna-wrap">
          <div className="erp-scroll tna-scroll">
            <table className="erp-grid tna-grid">
              <thead>
                <tr>
                  <th className="tna-sticky" rowSpan={2}>
                    Global Style
                  </th>
                  <th rowSpan={2}>Season</th>
                  <th rowSpan={2}>Inquiry No</th>
                  <th rowSpan={2}>PP Date</th>
                  {PLAN_EVENTS.map((ev) => (
                    <th key={ev.key} className="tna-group" colSpan={3}>
                      {ev.label}
                    </th>
                  ))}
                </tr>
                <tr>
                  {PLAN_EVENTS.map((ev) => [
                    <th key={`${ev.key}-p`} className="tna-sub">
                      Plan
                    </th>,
                    <th key={`${ev.key}-r`} className="tna-sub">
                      Revised Plan
                    </th>,
                    <th key={`${ev.key}-a`} className="tna-sub tna-sub-end">
                      Actual
                    </th>,
                  ])}
                </tr>
              </thead>
              <tbody>
                {visible.map(({ row, events }) => (
                  <tr key={row.id}>
                    <td className="tna-sticky tna-style" title={row.styleDescription}>
                      {row.globalStyle || <span className="empty-cell">—</span>}
                    </td>
                    <td>{row.season || <span className="empty-cell">—</span>}</td>
                    <td>{row.inquiryNo || <span className="empty-cell">—</span>}</td>
                    <td className="tna-ppdate">
                      {!row.ppDate ? (
                        <span className="empty-cell">—</span>
                      ) : isValidDate(row.ppDate) ? (
                        formatShort(row.ppDate)
                      ) : (
                        // Import keeps the original text when it cannot read a
                        // date; showing it explains the empty plan row.
                        <span
                          className="bad-date"
                          title="Not a recognised date — no plan can be calculated for this style. Fix it on the Pre-Prod Chart."
                        >
                          {row.ppDate}
                        </span>
                      )}
                    </td>
                    {events.map((ev) => [
                      <td key={`${ev.key}-p`} className="tna-plan-cell">
                        {ev.plan ? formatShort(ev.plan) : <span className="empty-cell">—</span>}
                      </td>,
                      <td key={`${ev.key}-r`} className="tna-edit-cell">
                        {editable(row.id, ev.key, 'revised', ev.revised)}
                      </td>,
                      <td
                        key={`${ev.key}-a`}
                        className={`tna-edit-cell tna-sub-end${
                          ev.actual ? ` st-${ev.status}` : ''
                        }`}
                        title={ev.actual ? STATUS_LABEL[ev.status] : undefined}
                      >
                        {editable(row.id, ev.key, 'actual', ev.actual)}
                      </td>,
                    ])}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4 + PLAN_EVENTS.length * 3} style={{ textAlign: 'center', padding: 30 }}>
                      No styles match “{query}”.
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
      ) : (
        <GanttChart rows={filtered} holidays={holidaySet} query={query} />
      )}
    </Layout>
  )
}
