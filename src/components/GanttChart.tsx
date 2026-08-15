import { useMemo, useRef, useState } from 'react'
import { CalendarRange, LocateFixed } from 'lucide-react'
import {
  addDays,
  dayDiff,
  eachDay,
  formatDay,
  formatDelay,
  isValidDate,
  isWeekOff,
  parseISO,
  toDateInput,
  type WorkWeek,
} from '../lib/tna'
import type { EventState, PlanRow } from '../pages/TnaPlan'

const DAY_W = 36 // px per calendar day
const LABEL_W = 210 // sticky style column
const PAD_DAYS = 2 // breathing room either side of the range

interface Props {
  rows: PlanRow[]
  holidays: Set<string>
  workWeek: WorkWeek
  query: string
}

interface Tip {
  x: number
  y: number
  title: string
  lines: { label: string; value: string }[]
}

/** An event only appears once it has a date — actual if captured, else due. */
function markerDate(ev: EventState): string {
  return ev.actual || ev.due
}

export default function GanttChart({ rows, holidays, workWeek, query }: Props) {
  const [tip, setTip] = useState<Tip | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const range = useMemo(() => {
    // An unparseable PP Date survives import as raw text, so everything that
    // reaches the time axis has to be checked before it is used as a date.
    const dates: string[] = []
    const push = (d: string) => {
      if (isValidDate(d)) dates.push(d)
    }
    for (const r of rows) {
      for (const ev of r.events) push(markerDate(ev))
      push(r.row.ppDate)
    }
    if (dates.length === 0) return null
    dates.sort()
    return {
      start: addDays(dates[0], -PAD_DAYS),
      end: addDays(dates[dates.length - 1], PAD_DAYS),
    }
  }, [rows])

  const days = useMemo(() => (range ? eachDay(range.start, range.end) : []), [range])

  // Month bands across the top, so a long range stays readable.
  const months = useMemo(() => {
    const out: { label: string; start: number; count: number }[] = []
    days.forEach((iso, i) => {
      const d = parseISO(iso)
      if (!d) return
      const label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      const last = out[out.length - 1]
      if (last && last.label === label) last.count++
      else out.push({ label, start: i, count: 1 })
    })
    return out
  }, [days])

  const today = toDateInput(new Date())
  const todayIdx = range ? dayDiff(range.start, today) : null
  const showToday = todayIdx !== null && todayIdx >= 0 && todayIdx < days.length

  // Non-working = an explicit holiday, or a weekday the work-week rule skips.
  const nonWorking = (iso: string) => holidays.has(iso) || isWeekOff(iso, workWeek)

  const nonWorkingIdx = useMemo(
    () => days.map((d, i) => (nonWorking(d) ? i : -1)).filter((i) => i >= 0),
    [days, holidays, workWeek],
  )

  /**
   * Centre today's column in the timeline. The style column is sticky over the
   * left of the viewport, so only the space beside it actually shows days.
   */
  function scrollToToday() {
    const el = scrollRef.current
    if (!el || todayIdx === null) return
    const trackViewport = el.clientWidth - LABEL_W
    const left = todayIdx * DAY_W + DAY_W / 2 - trackViewport / 2
    el.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
  }

  function showTip(e: React.MouseEvent, ev: EventState) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const lines = [{ label: 'Plan', value: ev.plan ? formatDay(ev.plan) : '—' }]
    if (ev.revised) lines.push({ label: 'Revised', value: formatDay(ev.revised) })
    lines.push({ label: 'Actual', value: ev.actual ? formatDay(ev.actual) : 'Not started' })
    if (ev.actual && ev.delay !== null) {
      // "Delay : On time" reads oddly, so a zero delay is labelled as status.
      lines.push({ label: ev.delay === 0 ? 'Status' : 'Delay', value: formatDelay(ev.delay) })
    }
    setTip({ x: r.left + r.width / 2, y: r.top, title: ev.label, lines })
  }

  if (rows.length === 0) {
    return (
      <div className="grid-wrap">
        <div className="empty">
          <div className="empty-ico">
            <CalendarRange size={30} />
          </div>
          <h3>Nothing to chart</h3>
          <p>{query ? `No styles match “${query}”.` : 'No styles available.'}</p>
        </div>
      </div>
    )
  }

  if (!range) {
    return (
      <div className="grid-wrap">
        <div className="empty">
          <div className="empty-ico">
            <CalendarRange size={30} />
          </div>
          <h3>No dates to chart yet</h3>
          <p>
            Styles need a PP Date and the T&A intervals filled in before plan dates can be placed
            on a timeline.
          </p>
        </div>
      </div>
    )
  }

  const trackW = days.length * DAY_W

  return (
    <div className="erp-grid-wrap gantt-wrap">
      <div className="gantt-tools">
        <button
          className="btn btn-sm"
          onClick={scrollToToday}
          disabled={!showToday}
          title={
            showToday
              ? "Scroll the timeline to today's date"
              : 'Today is outside the planned date range'
          }
        >
          <LocateFixed size={15} />
          Today
        </button>
      </div>
      <div className="gantt-scroll" ref={scrollRef} onScroll={() => setTip(null)}>
        <div className="gantt-body" style={{ width: LABEL_W + trackW }}>
          <div className="gantt-row gantt-months">
            <div className="gantt-label gantt-corner">Style</div>
            <div className="gantt-track" style={{ width: trackW }}>
              {months.map((m) => (
                <div
                  key={m.label}
                  className="gantt-month"
                  style={{ left: m.start * DAY_W, width: m.count * DAY_W }}
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          <div className="gantt-row gantt-days">
            <div className="gantt-label gantt-corner" />
            <div className="gantt-track" style={{ width: trackW }}>
              {days.map((iso, i) => {
                const d = parseISO(iso)
                if (!d) return null
                return (
                  <div
                    key={iso}
                    className={`gantt-day${nonWorking(iso) ? ' hol' : ''}${
                      iso === today ? ' is-today' : ''
                    }`}
                    style={{ left: i * DAY_W, width: DAY_W }}
                    title={
                      holidays.has(iso)
                        ? 'Holiday — non-working day'
                        : isWeekOff(iso, workWeek)
                          ? 'Weekly off — non-working day'
                          : undefined
                    }
                  >
                    <b>{d.getDate()}</b>
                    <span>{d.toLocaleDateString('en-GB', { weekday: 'narrow' })}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {rows.map(({ row, events }) => {
            // Events landing on the same day share the column side by side.
            const byDay = new Map<number, EventState[]>()
            for (const ev of events) {
              const d = markerDate(ev)
              if (!d) continue
              const idx = dayDiff(range.start, d)
              if (idx === null || idx < 0 || idx >= days.length) continue
              const list = byDay.get(idx)
              if (list) list.push(ev)
              else byDay.set(idx, [ev])
            }

            return (
              <div className="gantt-row gantt-style-row" key={row.id}>
                <div className="gantt-label">
                  <b title={row.styleDescription}>{row.globalStyle || '—'}</b>
                  <span>{row.inquiryNo || '—'}</span>
                </div>
                <div className="gantt-track" style={{ width: trackW }}>
                  {nonWorkingIdx.map((i) => (
                    <div key={i} className="gantt-hol" style={{ left: i * DAY_W, width: DAY_W }} />
                  ))}
                  {showToday && (
                    <div className="gantt-today" style={{ left: todayIdx! * DAY_W + DAY_W / 2 }} />
                  )}
                  {[...byDay.entries()].map(([idx, list]) =>
                    list.map((ev, k) => {
                      const w = Math.max(11, (DAY_W - 6) / list.length)
                      return (
                        <div
                          key={ev.key}
                          className={`gantt-marker st-${ev.status}`}
                          style={{ left: idx * DAY_W + 3 + k * w, width: w - 1 }}
                          onMouseEnter={(e) => showTip(e, ev)}
                          onMouseLeave={() => setTip(null)}
                        >
                          {w >= 24 ? ev.short : ''}
                        </div>
                      )
                    }),
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {tip && (
        <div className="gantt-tip" style={{ left: tip.x, top: tip.y }}>
          <b>{tip.title}</b>
          {tip.lines.map((l) => (
            <div key={l.label} className="gantt-tip-line">
              <span>{l.label}</span>
              <i>:</i>
              {l.value}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
