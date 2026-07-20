import type { PreProdRow } from '../types'
import { uid } from '../store/store'

// Raw order-chart row: header -> cell value (all strings, trimmed)
export type RawRow = Record<string, string>

// Canonical field -> list of accepted header spellings (normalized, lowercase, no spaces/punct)
const FIELD_ALIASES: Record<string, string[]> = {
  season: ['season'],
  program: ['program', 'programme'],
  styleDescription: ['styledescription', 'styledesc', 'description', 'stylename'],
  globalStyle: ['globalstyle', 'global', 'globalstyleno', 'globalstylenumber'],
  m3Style: ['m3style', 'm3', 'm3styleno', 'm3stylenumber'],
  newRepeat: ['newrepeat', 'newrpt', 'neworrepeat', 'newrepeatstatus'],
  destination: ['destination', 'destinations', 'dest', 'country', 'market'],
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
  ppColor: ['ppcolor', 'ppcolour', 'ppcolors', 'ppcolours', 'color', 'colour'],
  ppDate: ['ppdate', 'ppdt', 'ppdatetime'],
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

// Build a map: canonical field -> actual header found in the file (or undefined).
export function detectColumns(headers: string[]): Record<string, string | undefined> {
  const normalized = headers.map((h) => ({ raw: h, norm: normalize(h) }))
  const out: Record<string, string | undefined> = {}
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const hit = normalized.find((h) => aliases.includes(h.norm))
    out[field] = hit?.raw
  }
  return out
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
 * `destination` and `ppColor` accumulate as unique chip arrays across all lines
 * of the style; every other field takes the first non-empty value.
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
    const ppColors = uniquePreserveOrder(
      lines.flatMap((l) => splitMulti(pick(l, cols.ppColor))),
    )

    rows.push({
      id: uid(),
      season: firstNonEmpty(lines.map((l) => pick(l, cols.season))),
      inquiryNo: meta.inquiryNo,
      program: firstNonEmpty(lines.map((l) => pick(l, cols.program))),
      fabricQuality: '', // manual
      styleDescription: firstNonEmpty(lines.map((l) => pick(l, cols.styleDescription))),
      fabricMill: '', // manual
      merchant: meta.merchant,
      globalStyle: firstNonEmpty(lines.map((l) => pick(l, cols.globalStyle))),
      m3Style: firstNonEmpty(lines.map((l) => pick(l, cols.m3Style))),
      newRepeat: firstNonEmpty(lines.map((l) => pick(l, cols.newRepeat))),
      destinations,
      prodPlant: firstNonEmpty(lines.map((l) => pick(l, cols.prodPlant))),
      embPlant: firstNonEmpty(lines.map((l) => pick(l, cols.embPlant))),
      graphicSoApproval: firstNonEmpty(lines.map((l) => pick(l, cols.graphicSoApproval))),
      ppColors,
      ppDate: firstNonEmpty(lines.map((l) => pick(l, cols.ppDate))),
      createdAt: new Date().toISOString(),
    })
  }

  return { rows, missingGlobalStyle }
}
