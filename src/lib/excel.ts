import * as XLSX from 'xlsx'
import type { MaterialRow, PreProdRow } from '../types'
import { COLUMNS, cellText } from './columns'
import type { RawRow } from './preprod'
import { findHeaderRow } from './preprod'
import {
  MATERIAL_COLUMNS,
  MATERIAL_SHEET_NAME,
  findMaterialHeaderRow,
  materialCellText,
} from './materials'

export interface ParsedSheet {
  headers: string[]
  rows: RawRow[]
}

// Thrown when a workbook doesn't carry the worksheet we were told to read.
export class MissingSheetError extends Error {
  constructor(
    public sheetName: string,
    public available: string[],
  ) {
    super(`Sheet "${sheetName}" was not found`)
    this.name = 'MissingSheetError'
  }
}

/**
 * Read a worksheet into headers + string rows. The header row isn't always the
 * first one — sheets may have banner / grouping rows above it — so the caller
 * supplies the detector for its own column vocabulary.
 */
function sheetToRows(
  sheet: XLSX.WorkSheet,
  findHeader: (aoa: unknown[][]) => number,
): ParsedSheet {
  // Array-of-arrays so we can read the header row explicitly.
  const aoa = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  })
  if (aoa.length === 0) return { headers: [], rows: [] }

  const headerIdx = findHeader(aoa as unknown[][])

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

// Read an uploaded order-chart file (.xlsx/.xls/.csv) into headers + string rows.
export async function parseOrderChart(file: File): Promise<ParsedSheet> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) return { headers: [], rows: [] }
  return sheetToRows(sheet, findHeaderRow)
}

/**
 * Read the materials workbook. Only the "Data" tab is read — every other tab in
 * the file is ignored. A CSV has a single (differently named) sheet, so it is
 * accepted as the Data tab.
 */
export async function parseMaterialData(file: File): Promise<ParsedSheet> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })

  const target = MATERIAL_SHEET_NAME.toLowerCase()
  const name =
    wb.SheetNames.find((n) => n.trim().toLowerCase() === target) ??
    (wb.SheetNames.length === 1 ? wb.SheetNames[0] : undefined)
  if (!name) throw new MissingSheetError(MATERIAL_SHEET_NAME, wb.SheetNames)

  const sheet = wb.Sheets[name]
  if (!sheet) throw new MissingSheetError(MATERIAL_SHEET_NAME, wb.SheetNames)
  return sheetToRows(sheet, findMaterialHeaderRow)
}

/**
 * Export Pre-Prod rows to an .xlsx file. Chip arrays are joined comma-separated.
 * Material details go on their own "Materials" tab.
 */
export function exportPreProd(
  rows: PreProdRow[],
  materials: MaterialRow[],
  fileName: string,
): void {
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

  const materialData = materials.map((row) => {
    const record: Record<string, string> = {}
    for (const col of MATERIAL_COLUMNS) {
      record[col.label] = materialCellText(row, col)
    }
    return record
  })
  const materialWs = XLSX.utils.json_to_sheet(materialData, {
    header: MATERIAL_COLUMNS.map((c) => c.label),
  })
  materialWs['!cols'] = MATERIAL_COLUMNS.map((c) => ({
    wch: Math.max(c.label.length + 2, c.key === 'itemDescription' ? 40 : 18),
  }))
  XLSX.utils.book_append_sheet(wb, materialWs, 'Materials')

  XLSX.writeFile(wb, fileName)
}
