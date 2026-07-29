import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react'

// 0 = "All" (no paging).
export const PAGE_SIZES = [10, 25, 50, 100, 0]

interface Props {
  total: number
  page: number // 1-based, already clamped
  pageSize: number
  onPage: (page: number) => void
  onPageSize: (size: number) => void
  noun?: string // e.g. "styles"
}

export default function Pagination({
  total,
  page,
  pageSize,
  onPage,
  onPageSize,
  noun = 'rows',
}: Props) {
  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(total / pageSize))
  const first = total === 0 ? 0 : pageSize === 0 ? 1 : (page - 1) * pageSize + 1
  const last = pageSize === 0 ? total : Math.min(page * pageSize, total)

  return (
    <div className="pagination">
      <div className="page-size">
        <label htmlFor="page-size">Rows per page</label>
        <select
          id="page-size"
          className="select"
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>
              {s === 0 ? 'All' : s}
            </option>
          ))}
        </select>
      </div>

      <span className="page-range">
        {total === 0 ? `No ${noun}` : `${first}–${last} of ${total} ${noun}`}
      </span>

      <div className="page-nav">
        <button
          className="btn icon-btn btn-ghost"
          onClick={() => onPage(1)}
          disabled={page <= 1}
          aria-label="First page"
          title="First page"
        >
          <ChevronFirst size={16} />
        </button>
        <button
          className="btn icon-btn btn-ghost"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          title="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="page-of">
          Page {page} of {totalPages}
        </span>
        <button
          className="btn icon-btn btn-ghost"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          title="Next page"
        >
          <ChevronRight size={16} />
        </button>
        <button
          className="btn icon-btn btn-ghost"
          onClick={() => onPage(totalPages)}
          disabled={page >= totalPages}
          aria-label="Last page"
          title="Last page"
        >
          <ChevronLast size={16} />
        </button>
      </div>
    </div>
  )
}
