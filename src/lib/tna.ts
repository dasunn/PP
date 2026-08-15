// ---- T&A setup: the fixed event chain and its intervals ----
//
// The milestones below are hard-coded and ordered: every consecutive pair is
// one row on the Time Intervals grid, and the user supplies only the number of
// days between them. Interval keys are built from the event keys (not the row
// index) so stored values survive if the chain is ever extended.

export interface TnaEvent {
  key: string
  label: string
  /** Abbreviation used for Gantt markers, where there is no room for the label. */
  short: string
}

export interface TnaInterval {
  key: string
  from: string
  to: string
}

export const TNA_EVENTS: TnaEvent[] = [
  { key: 'matInhouse', label: 'Mat inhouse Date', short: 'MI' },
  { key: 'srf', label: 'SRF', short: 'SRF' },
  { key: 'pattern', label: 'Pattern', short: 'PAT' },
  { key: 'cut', label: 'Cut', short: 'CUT' },
  { key: 'sentToPrint', label: 'Sent to Print', short: 'STP' },
  { key: 'printRcvd', label: 'Print Rcvd', short: 'PRC' },
  { key: 'sewingIn', label: 'Sewing In', short: 'SIN' },
  { key: 'sewingOut', label: 'Sewing Out', short: 'SOU' },
  { key: 'qc', label: 'QC', short: 'QC' },
  { key: 'scftReview', label: 'SCFT Review', short: 'SCF' },
  { key: 'dispatchToHub', label: 'Dispatch to Hub', short: 'DTH' },
  { key: 'ppApproval', label: 'PP approval', short: 'PPA' },
  { key: 'ppDate', label: 'PP Date', short: 'PP' },
]

/**
 * The events that get a Plan / Revised Plan / Actual column group on the T&A
 * plan grid. PP Date is excluded — it comes from the Pre-Prod chart and is the
 * anchor the whole plan is calculated backwards from.
 */
export const PLAN_EVENTS: TnaEvent[] = TNA_EVENTS.slice(0, -1)

export const TNA_INTERVALS: TnaInterval[] = TNA_EVENTS.slice(0, -1).map((from, i) => {
  const to = TNA_EVENTS[i + 1]
  return { key: `${from.key}__${to.key}`, from: from.label, to: to.label }
})

/** Days per interval, keyed by `TnaInterval.key`. Missing = not set yet. */
export type TnaIntervalDays = Record<string, number>

/** yyyy-mm-dd for a local date, i.e. what an <input type="date"> expects. */
export function toDateInput(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** "Mon, 04 Aug 2025" — display form for a yyyy-mm-dd holiday value. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Total lead time in days across every interval that has a value. */
export function totalDays(days: TnaIntervalDays): number {
  return TNA_INTERVALS.reduce((sum, i) => sum + (days[i.key] ?? 0), 0)
}

// ---- Date helpers (all yyyy-mm-dd, all local — never UTC) ----

export function parseISO(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '')
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

/** "10 Jul 26" — compact enough for a 40-column grid. */
export function formatShort(iso: string): string {
  const d = parseISO(iso)
  if (!d) return ''
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
}

/** "10 Jul" — used inside Gantt tooltips where the year is implied. */
export function formatDay(iso: string): string {
  const d = parseISO(iso)
  if (!d) return ''
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso)
  if (!d) return ''
  d.setDate(d.getDate() + n)
  return toDateInput(d)
}

/** Calendar days from `from` to `to`; negative when `to` is earlier. */
export function dayDiff(from: string, to: string): number | null {
  const a = parseISO(from)
  const b = parseISO(to)
  if (!a || !b) return null
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

/**
 * Every date from `start` to `end` inclusive. Empty when either end is not a
 * real date — imported PP Dates keep their raw text when they cannot be parsed,
 * so callers can be handed anything.
 */
export function eachDay(start: string, end: string): string[] {
  const span = dayDiff(start, end)
  if (span === null || span < 0) return []
  const out: string[] = []
  let cur = start
  for (let i = 0; i <= span && i < 2000; i++) {
    out.push(cur)
    cur = addDays(cur, 1)
  }
  return out
}

/** True when the value is a real yyyy-mm-dd date rather than leftover text. */
export function isValidDate(iso: string): boolean {
  return parseISO(iso) !== null
}

/** Monday of the week containing `d` (local time), as yyyy-mm-dd. */
export function startOfWeek(d: Date = new Date()): string {
  const day = d.getDay() // 0 = Sun .. 6 = Sat
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  return toDateInput(monday)
}

// ---- Work week: which weekdays are non-working, before Holidays are applied ----

export type WorkWeek = 'monFri' | 'monSat' | 'all'

export interface WorkWeekOption {
  key: WorkWeek
  label: string
  desc: string
  /** getDay() values (0 = Sun .. 6 = Sat) treated as non-working. */
  off: number[]
}

export const WORK_WEEK_OPTIONS: WorkWeekOption[] = [
  {
    key: 'monFri',
    label: 'Monday to Friday',
    desc: 'Saturday and Sunday are non-working days.',
    off: [0, 6],
  },
  {
    key: 'monSat',
    label: 'Monday to Saturday',
    desc: 'Sunday is a non-working day.',
    off: [0],
  },
  {
    key: 'all',
    label: 'Whole week',
    desc: 'Every day is a working day — only the Holidays tab is skipped.',
    off: [],
  },
]

const WORK_WEEK_OFF: Record<WorkWeek, Set<number>> = {
  monFri: new Set([0, 6]),
  monSat: new Set([0]),
  all: new Set(),
}

/** True when `iso` falls on a day the work week setting treats as non-working. */
export function isWeekOff(iso: string, workWeek: WorkWeek): boolean {
  const d = parseISO(iso)
  if (!d) return false
  return WORK_WEEK_OFF[workWeek].has(d.getDay())
}

// ---- Backward planning ----

/**
 * Steps back `days` working days from `iso`, skipping the work week's
 * non-working weekdays plus anything on the Holidays tab.
 */
export function subtractWorkingDays(
  iso: string,
  days: number,
  holidays: Set<string>,
  workWeek: WorkWeek = 'all',
): string {
  let cur = iso
  const steps = Math.max(0, Math.min(Math.round(days), 3650))
  const isNonWorking = (d: string) => holidays.has(d) || isWeekOff(d, workWeek)
  for (let i = 0; i < steps; i++) {
    cur = addDays(cur, -1)
    // Walk further back while the landing day is a non-working day.
    while (isNonWorking(cur)) cur = addDays(cur, -1)
  }
  return cur
}

/** Planned date per event key. Missing keys = not derivable yet. */
export type PlanDates = Record<string, string>

/**
 * Works backwards from the style's PP Date through the T&A intervals. If an
 * interval has no day count the chain stops there, so every earlier event is
 * left blank rather than silently assumed to be zero days.
 */
export function computePlanDates(
  ppDate: string,
  intervalDays: TnaIntervalDays,
  holidays: Set<string>,
  workWeek: WorkWeek = 'all',
): PlanDates {
  const plan: PlanDates = {}
  if (!parseISO(ppDate)) return plan
  plan.ppDate = ppDate

  for (let i = TNA_EVENTS.length - 2; i >= 0; i--) {
    const from = TNA_EVENTS[i]
    const to = TNA_EVENTS[i + 1]
    const days = intervalDays[`${from.key}__${to.key}`]
    const toDate = plan[to.key]
    if (days === undefined || !toDate) break
    plan[from.key] = subtractWorkingDays(toDate, days, holidays, workWeek)
  }
  return plan
}

// ---- Status ----

export type PlanStatus = 'notStarted' | 'early' | 'onTime' | 'slight' | 'late'

export const STATUS_LABEL: Record<PlanStatus, string> = {
  notStarted: 'Not started',
  early: 'Completed early',
  onTime: 'On time',
  slight: '1–2 days late',
  late: 'More than 2 days late',
}

/**
 * Compares the actual date against the date the event was due — the revised
 * plan when one has been entered, otherwise the calculated plan.
 */
export function eventStatus(due: string, actual: string): PlanStatus {
  if (!actual) return 'notStarted'
  const delay = dayDiff(due, actual)
  if (delay === null) return 'notStarted'
  if (delay < 0) return 'early'
  if (delay === 0) return 'onTime'
  if (delay <= 2) return 'slight'
  return 'late'
}

/** "+3 days" / "-2 days" / "On time" */
export function formatDelay(delay: number): string {
  if (delay === 0) return 'On time'
  const n = Math.abs(delay)
  return `${delay > 0 ? '+' : '−'}${n} day${n === 1 ? '' : 's'}`
}
