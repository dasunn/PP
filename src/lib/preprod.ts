import type { PreProdRow } from '../types'
import { uid } from '../store/store'
import { normalizePpStatus } from './columns'

// Raw order-chart row: header -> cell value (all strings, trimmed)
export type RawRow = Record<string, string>

// Canonical field -> list of accepted header spellings (normalized, lowercase, no spaces/punct)
const FIELD_ALIASES: Record<string, string[]> = {
  season: ['season'],
  program: ['program', 'programme'],
  styleDescription: ['styledescription', 'styledesc', 'description', 'stylename'],
  globalStyle: ['globalstyle', 'global', 'globalstyleno', 'globalstylenumber'],
  m3Style: ['m3style', 'm3', 'm3styleno', 'm3stylenumber'],
  newRepeat: [
    'neworrepeatstylefrombrand',
    'newrepeat',
    'newrpt',
    'neworrepeat',
    'newrepeatstatus',
  ],
  destination: ['destination2', 'destination', 'destinations', 'dest', 'country', 'market'],
  prodPlant: ['prodplant', 'productionplant', 'plant', 'prodplantname'],
  embPlant: ['embplant', 'embroideryplant', 'embellishmentplant', 'embplantname'],
  graphicSoApproval: [
    'graphicsoapprovalstatus',
    'graphicsoapproval',
    'graphicsostatus',
    'graphicapprovalstatus',
    'soapprovalstatus',
    'graphicso',
  ],
  ppColor: [
    'garmentcolor2',
    'garmentcolour2',
    'garmentcolor',
    'garmentcolour',
    'ppcolor',
    'ppcolour',
    'ppcolors',
    'ppcolours',
    'color',
    'colour',
  ],
  ppStatus: [
    'ppstatus',
    'ppapprovalstatus',
    'ppapproval',
    'ppapproved',
    'ppsamplestatus',
  ],
  ppDate: ['ppdate', 'ppdt', 'ppdatetime', 'pp'],
}

function normalize(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Every accepted (normalized) header spelling across all known fields.
const ALL_ALIASES = new Set(Object.values(FIELD_ALIASES).flat())

// How many known column headers appear in a candidate header row.
function headerRowScore(cells: unknown[]): number {
  const norms = new Set(cells.map((c) => normalize(String(c ?? ''))).filter(Boolean))
  let score = 0
  for (const alias of ALL_ALIASES) if (norms.has(alias)) score++
  return score
}

/**
 * Order charts often carry banner / grouping rows (e.g. "BULK TEAM") above the
 * real column headers. Scan the first rows and return the index of the one that
 * best matches known column names; falls back to 0 if nothing matches.
 */
export function findHeaderRow(aoa: unknown[][]): number {
  const limit = Math.min(aoa.length, 25)
  let bestIdx = 0
  let bestScore = 0
  for (let i = 0; i < limit; i++) {
    const score = headerRowScore(aoa[i] ?? [])
    if (score > bestScore) {
      bestScore = score
      bestIdx = i
    }
  }
  return bestScore > 0 ? bestIdx : 0
}

/**
 * Build a map: canonical field -> actual header found in the file (or undefined).
 * Aliases are tried in list order, so the preferred spelling wins when a sheet
 * carries several (e.g. both "DESTINATION" and "DESTINATION2").
 */
export function detectColumns(headers: string[]): Record<string, string | undefined> {
  const normalized = headers.map((h) => ({ raw: h, norm: normalize(h) }))
  const out: Record<string, string | undefined> = {}
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      const hit = normalized.find((h) => h.norm === alias)
      if (hit) {
        out[field] = hit.raw
        break
      }
    }
  }
  return out
}

const MONTHS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
]

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Normalize an order-chart date cell to `yyyy-mm-dd` so it can drive the
 * date picker in edit mode. Numeric dates are read day-first (25/12/2026);
 * ambiguous ones (03/04/2026) fall back to month-first, matching how Excel
 * renders them in a US locale. Anything unrecognised is returned untouched.
 */
export function toISODate(value: string): string {
  const s = (value ?? '').trim()
  if (!s) return ''

  // Already ISO (possibly with a time component).
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  // Excel serial number (days since 1899-12-30).
  if (/^\d{5}$/.test(s)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Number(s) * 86400000)
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
  }

  // d/m/yyyy, d-m-yy, d.m.yyyy … (m/d/yyyy when the 2nd part can only be a day)
  const num = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/)
  if (num) {
    const a = Number(num[1])
    const b = Number(num[2])
    const [day, month] = b > 12 ? [b, a] : [a, b]
    let year = Number(num[3])
    if (year < 100) year += year < 70 ? 2000 : 1900
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad(month)}-${pad(day)}`
    }
    return s
  }

  // 15-Mar-2026 / Mar 15 2026 / 15 March 2026
  const named = s.match(/^(\d{1,2})[\s\-/]*([a-z]{3,})[\s\-/]*(\d{2,4})$/i)
  const named2 = s.match(/^([a-z]{3,})[\s\-/]*(\d{1,2}),?[\s\-/]*(\d{2,4})$/i)
  const parts = named
    ? { day: named[1], mon: named[2], year: named[3] }
    : named2
      ? { day: named2[2], mon: named2[1], year: named2[3] }
      : null
  if (parts) {
    const mi = MONTHS.indexOf(parts.mon.slice(0, 3).toLowerCase())
    if (mi >= 0) {
      let year = Number(parts.year)
      if (year < 100) year += year < 70 ? 2000 : 1900
      return `${year}-${pad(mi + 1)}-${pad(Number(parts.day))}`
    }
  }

  return s
}

function pick(row: RawRow, header: string | undefined): string {
  if (!header) return ''
  return (row[header] ?? '').trim()
}

// Split a cell that may contain multiple values (comma / slash / semicolon / newline separated).
function splitMulti(value: string): string[] {
  if (!value) return []
  return value
    .split(/[,;/\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function firstNonEmpty(values: string[]): string {
  return values.find((v) => v && v.trim().length > 0)?.trim() ?? ''
}

function uniquePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of values) {
    const key = v.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      out.push(v)
    }
  }
  return out
}

export interface BuildResult {
  rows: PreProdRow[]
  missingGlobalStyle: number // lines skipped because they had no GLOBAL STYLE
}

/**
 * Collapse order-chart lines into Pre-Prod rows: one row per unique GLOBAL STYLE.
 * `destination` and `ppColor` accumulate as unique arrays across all lines of the
 * style; every other field takes the first non-empty value. Colours land in
 * `colorOptions` — `ppColors` stays empty (shown as "Pending") until the user
 * ticks the PP colour(s) in edit mode. `ppStatus` defaults to "Not Approved"
 * unless the sheet carries a PP Status column saying otherwise.
 */
export function buildPreProdRows(
  raw: RawRow[],
  headers: string[],
  meta: { inquiryNo: string; merchant: string },
): BuildResult {
  const cols = detectColumns(headers)
  const groups = new Map<string, RawRow[]>()
  let missingGlobalStyle = 0

  for (const row of raw) {
    const gs = pick(row, cols.globalStyle)
    if (!gs) {
      missingGlobalStyle++
      continue
    }
    const key = gs.toLowerCase()
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }

  const rows: PreProdRow[] = []
  for (const lines of groups.values()) {
    const destinations = uniquePreserveOrder(
      lines.flatMap((l) => splitMulti(pick(l, cols.destination))),
    )
    const colorOptions = uniquePreserveOrder(
      lines.flatMap((l) => splitMulti(pick(l, cols.ppColor))),
    )

    rows.push({
      id: uid(),
      season: firstNonEmpty(lines.map((l) => pick(l, cols.season))),
      inquiryNo: meta.inquiryNo,
      program: firstNonEmpty(lines.map((l) => pick(l, cols.program))),
      styleDescription: firstNonEmpty(lines.map((l) => pick(l, cols.styleDescription))),
      merchant: meta.merchant,
      globalStyle: firstNonEmpty(lines.map((l) => pick(l, cols.globalStyle))),
      m3Style: firstNonEmpty(lines.map((l) => pick(l, cols.m3Style))),
      newRepeat: firstNonEmpty(lines.map((l) => pick(l, cols.newRepeat))),
      destinations,
      prodPlant: firstNonEmpty(lines.map((l) => pick(l, cols.prodPlant))),
      embPlant: firstNonEmpty(lines.map((l) => pick(l, cols.embPlant))),
      graphicSoApproval: firstNonEmpty(lines.map((l) => pick(l, cols.graphicSoApproval))),
      colorOptions,
      ppColors: [], // "Pending" until the PP colour is ticked in edit mode
      // Blank / unrecognised on the sheet means the PP is not approved yet.
      ppStatus: normalizePpStatus(firstNonEmpty(lines.map((l) => pick(l, cols.ppStatus)))),
      ppDate: toISODate(firstNonEmpty(lines.map((l) => pick(l, cols.ppDate)))),
      createdAt: new Date().toISOString(),
    })
  }

  return { rows, missingGlobalStyle }
}
