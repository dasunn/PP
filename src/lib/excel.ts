import * as XLSX from 'xlsx'
import type { PreProdRow } from '../types'
import { COLUMNS, cellText } from './columns'
import type { RawRow } from './preprod'
import { findHeaderRow } from './preprod'

export interface ParsedSheet {
  headers: string[]
  rows: RawRow[]
}

// Read an uploaded order-chart file (.xlsx/.xls/.csv) into headers + string rows.
export async function parseOrderChart(file: File): Promise<ParsedSheet> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const sheetName = wb.SheetNames[0]
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return { headers: [], rows: [] }

  // Array-of-arrays so we can read the header row explicitly.
  const aoa = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  })
  if (aoa.length === 0) return { headers: [], rows: [] }

  // The header row isn't always the first row — order charts may have banner /
  // grouping rows above it. Detect the real one before reading data.
  const headerIdx = findHeaderRow(aoa as unknown[][])

  const headers = (aoa[headerIdx] as unknown[]).map((h) => String(h ?? '').trim())
  const rows: RawRow[] = []
  for (let i = headerIdx + 1; i < aoa.length; i++) {
    const arr = aoa[i] as unknown[]
    if (!arr || arr.every((c) => String(c ?? '').trim() === '')) continue
    const obj: RawRow = {}
    headers.forEach((h, idx) => {
      if (h) obj[h] = String(arr[idx] ?? '').trim()
    })
    rows.push(obj)
  }
  return { headers, rows }
}

// Export Pre-Prod rows to an .xlsx file. Chip arrays are joined comma-separated.
export function exportPreProd(rows: PreProdRow[], fileName: string): void {
  const data = rows.map((row) => {
    const record: Record<string, string> = {}
    for (const col of COLUMNS) {
      record[col.label] = cellText(row, col)
    }
    return record
  })

  const ws = XLSX.utils.json_to_sheet(data, {
    header: COLUMNS.map((c) => c.label),
  })

  // Reasonable column widths.
  ws['!cols'] = COLUMNS.map((c) => ({ wch: Math.max(c.label.length + 2, 16) }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Pre-Prod Chart')
  XLSX.writeFile(wb, fileName)
}
