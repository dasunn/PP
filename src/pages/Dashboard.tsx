import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Layers,
  Clock,
  Plus,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  CalendarClock,
  AlertTriangle,
  Filter,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts'
import Layout from '../components/Layout'
import { useStore } from '../store/store'
import { isPpApproved } from '../lib/columns'
import type { PreProdRow } from '../types'
import {
  PLAN_EVENTS,
  addDays,
  computePlanDates,
  dayDiff,
  eventStatus,
  formatDay,
  isValidDate,
  startOfWeek,
  toDateInput,
  STATUS_LABEL,
  type PlanStatus,
} from '../lib/tna'

// Modern, varied hues for charts — replaces the old single-red family.
const PALETTE = ['#4f46e5', '#0d9488', '#d97706', '#7c3aed', '#2563eb', '#e11d48']

// Per-card accent (icon colour + soft icon background) for the top stat tiles.
const STAT_ACCENTS = {
  indigo: { color: '#4f46e5', bg: '#eef0fd' },
  teal: { color: '#0d9488', bg: '#e6f7f5' },
  violet: { color: '#7c3aed', bg: '#f3ecfe' },
  amber: { color: '#d97706', bg: '#fef3e2' },
} as const

function countBy(rows: PreProdRow[], get: (r: PreProdRow) => string): { name: string; value: number }[] {
  const map = new Map<string, number>()
  for (const r of rows) {
    const key = (get(r) || 'Unspecified').trim() || 'Unspecified'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

function countByMulti(rows: PreProdRow[], get: (r: PreProdRow) => string[]) {
  const map = new Map<string, number>()
  for (const r of rows) {
    for (const v of get(r)) {
      const key = v.trim()
      if (key) map.set(key, (map.get(key) ?? 0) + 1)
    }
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

/** One T&A action, placed on the week strip or the delayed list (or both). */
interface WeekAction {
  id: string
  style: string
  styleDescription: string
  eventLabel: string
  due: string
  actual: string
  status: PlanStatus
}

/** Overdue-with-no-actual reads as "late" but STATUS_LABEL's wording assumes a
 *  captured actual date — show the real day count instead. */
function actionStatusLabel(a: WeekAction, todayIso: string): string {
  if (!a.actual && a.status === 'late') {
    const days = dayDiff(a.due, todayIso) ?? 0
    return `Overdue ${days} day${days === 1 ? '' : 's'}`
  }
  return STATUS_LABEL[a.status]
}

export default function Dashboard() {
  const { preProdRows, history, tnaIntervalDays, holidays, workWeek, tnaPlans } = useStore()
  const [season, setSeason] = useState('all')

  const seasons = useMemo(() => {
    const set = new Set<string>()
    preProdRows.forEach((r) => {
      if (r.season.trim()) set.add(r.season.trim())
    })
    return [...set].sort()
  }, [preProdRows])

  const filteredRows = useMemo(
    // Compared trimmed: the dropdown is built from trimmed names, and imported
    // cells routinely carry stray whitespace that would otherwise match nothing.
    () =>
      season === 'all' ? preProdRows : preProdRows.filter((r) => r.season.trim() === season),
    [preProdRows, season],
  )

  const stats = useMemo(() => {
    const pendingSo = filteredRows.filter(
      (r) => !/approv|done|complete|ok|yes/i.test(r.graphicSoApproval),
    ).length
    const ppApproved = filteredRows.filter(isPpApproved).length
    return {
      styles: filteredRows.length,
      pendingSo,
      ppApproved,
    }
  }, [filteredRows])

  const newRepeat = useMemo(
    () => countBy(filteredRows, (r) => normalizeNewRepeat(r.newRepeat)),
    [filteredRows],
  )
  const byPlant = useMemo(() => countBy(filteredRows, (r) => r.prodPlant).slice(0, 6), [filteredRows])
  const byMerchant = useMemo(() => countBy(filteredRows, (r) => r.merchant).slice(0, 6), [filteredRows])
  const soStatus = useMemo(() => countBy(filteredRows, (r) => r.graphicSoApproval), [filteredRows])
  const topDest = useMemo(() => countByMulti(filteredRows, (r) => r.destinations).slice(0, 7), [filteredRows])
  const topColors = useMemo(() => countByMulti(filteredRows, (r) => r.ppColors).slice(0, 7), [filteredRows])

  // ---- This week's T&A actions + delayed actions, from the same backward plan ----
  const holidaySet = useMemo(() => new Set(holidays.map((h) => h.date)), [holidays])
  const todayIso = toDateInput(new Date())
  const weekStartIso = startOfWeek()
  const weekEndIso = addDays(weekStartIso, 6)

  const { weeklyActions, delayedActions, onTrackCount } = useMemo(() => {
    const weekly: WeekAction[] = []
    const delayed: WeekAction[] = []
    const delayedStyles = new Set<string>()

    for (const row of filteredRows) {
      const plan = computePlanDates(row.ppDate, tnaIntervalDays, holidaySet, workWeek)
      const cells = tnaPlans[row.id] ?? {}
      let rowDelayed = false

      for (const ev of PLAN_EVENTS) {
        const planned = plan[ev.key] ?? ''
        const revised = cells[ev.key]?.revised ?? ''
        const actual = cells[ev.key]?.actual ?? ''
        const due = revised || planned
        if (!due || !isValidDate(due)) continue

        // No actual yet: an event whose due date has already passed counts as
        // late (missed), otherwise it just hasn't started.
        const status: PlanStatus = actual
          ? eventStatus(due, actual)
          : due < todayIso
            ? 'late'
            : 'notStarted'

        const item: WeekAction = {
          id: `${row.id}-${ev.key}`,
          style: row.globalStyle || row.m3Style || '—',
          styleDescription: row.styleDescription,
          eventLabel: ev.label,
          due,
          actual,
          status,
        }

        if (due >= weekStartIso && due <= weekEndIso) weekly.push(item)
        if (status === 'late' || status === 'slight') {
          delayed.push(item)
          rowDelayed = true
        }
      }
      if (rowDelayed) delayedStyles.add(row.id)
    }

    weekly.sort((a, b) => a.due.localeCompare(b.due) || a.style.localeCompare(b.style))
    delayed.sort((a, b) => a.due.localeCompare(b.due) || a.style.localeCompare(b.style))

    return {
      weeklyActions: weekly,
      delayedActions: delayed,
      onTrackCount: filteredRows.length - delayedStyles.size,
    }
  }, [filteredRows, tnaIntervalDays, holidaySet, workWeek, tnaPlans, todayIso, weekStartIso, weekEndIso])

  const cards = [
    { label: 'Total Styles', value: stats.styles, icon: Layers, accent: STAT_ACCENTS.indigo },
    {
      label: 'PP Approved',
      value: `${stats.ppApproved} / ${stats.styles}`,
      icon: CheckCircle2,
      accent: STAT_ACCENTS.teal,
    },
    { label: 'Styles On Track', value: onTrackCount, icon: ShieldCheck, accent: STAT_ACCENTS.violet },
    { label: 'Pending SO Approval', value: stats.pendingSo, icon: Clock, accent: STAT_ACCENTS.amber },
  ]

  const empty = preProdRows.length === 0

  return (
    <Layout
      title="Dashboard"
      subtitle="Overview of your pre-production pipeline."
      actions={
        !empty && seasons.length > 0 ? (
          <div className="season-filter">
            <label htmlFor="season-select">Season</label>
            <select
              id="season-select"
              className="select"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
            >
              <option value="all">All seasons</option>
              {seasons.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        ) : undefined
      }
    >
      <div className="stat-grid">
        {cards.map((c) => (
          <div
            className="stat"
            key={c.label}
            // Set on the card so both the icon and the accent bar inherit it.
            style={{ '--stat-color': c.accent.color, '--stat-bg': c.accent.bg } as React.CSSProperties}
          >
            <div className="stat-ico">
              <c.icon size={20} />
            </div>
            <div className="stat-val">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      {empty ? (
        <div className="card card-pad empty">
          <div className="empty-ico">
            <Plus size={30} />
          </div>
          <h3>Nothing to visualise yet</h3>
          <p style={{ marginBottom: 18 }}>
            Import an order chart on the Pre-Prod Chart page and the dashboard will populate with
            live charts.
          </p>
          <Link className="btn btn-primary" to="/preprod" style={{ marginTop: 6 }}>
            Go to Pre-Prod Chart <ArrowRight size={16} />
          </Link>
        </div>
      ) : filteredRows.length === 0 ? (
        // Styles exist, just none in the chosen season — say so rather than
        // rendering a wall of zeroed cards and empty charts.
        <div className="card card-pad empty">
          <div className="empty-ico">
            <Filter size={30} />
          </div>
          <h3>No styles in {season}</h3>
          <p style={{ marginBottom: 18 }}>
            None of the {preProdRows.length} imported style
            {preProdRows.length === 1 ? '' : 's'} belong to this season.
          </p>
          <button className="btn" onClick={() => setSeason('all')}>
            Show all seasons
          </button>
        </div>
      ) : (
        <>
          <div className="dash-panels">
            <div className="card card-pad panel-card">
              <div className="panel-head">
                <h3>
                  <CalendarClock size={16} />
                  This Week's Planned Actions
                </h3>
                <span className="sub">
                  {formatDay(weekStartIso)} – {formatDay(weekEndIso)}
                </span>
              </div>
              {weeklyActions.length === 0 ? (
                <p className="panel-empty">No T&A actions fall in this week.</p>
              ) : (
                <div className="action-list">
                  {weeklyActions.map((a) => (
                    <div className="action-row" key={a.id}>
                      <span className={`action-dot st-${a.status}`} />
                      <div className="action-main">
                        <b title={a.styleDescription}>{a.style}</b>
                        <span>{a.eventLabel}</span>
                      </div>
                      <div className="action-dates">
                        <span>{formatDay(a.due)}</span>
                        {a.actual && a.actual !== a.due && <em>→ {formatDay(a.actual)}</em>}
                      </div>
                      <span className={`chip-status st-${a.status}`}>
                        {actionStatusLabel(a, todayIso)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card card-pad panel-card">
              <div className="panel-head">
                <h3>
                  <AlertTriangle size={16} />
                  Delayed Actions
                </h3>
                <span className="sub">{delayedActions.length} missed</span>
              </div>
              {delayedActions.length === 0 ? (
                <p className="panel-empty">Nothing delayed — every action is on schedule.</p>
              ) : (
                <div className="action-list">
                  {delayedActions.map((a) => (
                    <div className="action-row" key={a.id}>
                      <span className={`action-dot st-${a.status}`} />
                      <div className="action-main">
                        <b title={a.styleDescription}>{a.style}</b>
                        <span>{a.eventLabel}</span>
                      </div>
                      <div className="action-dates">
                        <span>Due {formatDay(a.due)}</span>
                        {a.actual ? <em>→ {formatDay(a.actual)}</em> : <em>Not started</em>}
                      </div>
                      <span className={`chip-status st-${a.status}`}>
                        {actionStatusLabel(a, todayIso)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="chart-grid">
            <ChartCard title="New vs Repeat" sub="Share of styles by order type">
              <PieChart>
                <Pie
                  data={newRepeat}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {newRepeat.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ChartCard>

            <ChartCard title="Graphic SO Approval" sub="Status breakdown across styles">
              <PieChart>
                <Pie
                  data={soStatus}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label
                >
                  {soStatus.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ChartCard>

            <ChartCard title="Top Destinations" sub="Style count per destination" className="col-span-2">
              <BarChart data={topDest} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#eef0fd' }} />
                <Bar dataKey="value" fill="#4f46e5" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ChartCard>

            <ChartCard title="Styles by Production Plant" sub="Top plants">
              <BarChart data={byPlant} margin={{ top: 6 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#e6f7f5' }} />
                <Bar dataKey="value" fill="#0d9488" radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ChartCard>

            <ChartCard title="Styles by Merchant" sub="Workload per merchant">
              <BarChart data={byMerchant} margin={{ top: 6 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#eaf2ff' }} />
                <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ChartCard>

            <ChartCard title="PP Colour Spread" sub="Most requested PP colours" className="col-span-2">
              <BarChart data={topColors} margin={{ top: 6 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#f3ecfe' }} />
                <Bar dataKey="value" fill="#7c3aed" radius={[6, 6, 0, 0]} barSize={26} />
              </BarChart>
            </ChartCard>
          </div>
        </>
      )}

      {history.length > 0 && (
        <p style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 20 }}>
          {history.length} import/export event{history.length === 1 ? '' : 's'} logged —{' '}
          <Link to="/history" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            view history
          </Link>
        </p>
      )}
    </Layout>
  )
}

function normalizeNewRepeat(v: string): string {
  const s = v.trim().toLowerCase()
  if (!s) return 'Unspecified'
  if (s.startsWith('n')) return 'New'
  if (s.startsWith('r')) return 'Repeat'
  return v.trim()
}

function ChartCard({
  title,
  sub,
  className,
  children,
}: {
  title: string
  sub: string
  className?: string
  children: React.ReactElement
}) {
  return (
    <div className={`chart-card${className ? ' ' + className : ''}`}>
      <h3>{title}</h3>
      <p className="sub">{sub}</p>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
