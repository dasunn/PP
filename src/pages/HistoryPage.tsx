import { useState } from 'react'
import { History, ArrowDownToLine, ArrowUpFromLine, FileSpreadsheet } from 'lucide-react'
import Layout from '../components/Layout'
import { useStore } from '../store/store'

type Filter = 'all' | 'import' | 'export'

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function HistoryPage() {
  const { history } = useStore()
  const [filter, setFilter] = useState<Filter>('all')

  const rows = history.filter((h) => filter === 'all' || h.type === filter)

  return (
    <Layout title="History" subtitle="Every order-chart import and Pre-Prod export.">
      <div className="toolbar">
        <div className="left">
          {(['all', 'import', 'export'] as Filter[]).map((f) => (
            <button
              key={f}
              className={`btn btn-sm${filter === f ? ' btn-primary' : ''}`}
              onClick={() => setFilter(f)}
              style={{ textTransform: 'capitalize' }}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="count-pill">{history.length} events</span>
      </div>

      <div className="grid-wrap">
        {rows.length === 0 ? (
          <div className="empty">
            <div className="empty-ico">
              <History size={30} />
            </div>
            <h3>No history yet</h3>
            <p>Imports and exports will be logged here with their file name and time.</p>
          </div>
        ) : (
          <div className="grid-scroll">
            <table className="grid">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>File Name</th>
                  <th>Rows</th>
                  <th>Date &amp; Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((h) => (
                  <tr key={h.id}>
                    <td>
                      <span className={`badge ${h.type === 'import' ? 'badge-import' : 'badge-export'}`}>
                        {h.type === 'import' ? (
                          <ArrowDownToLine size={13} />
                        ) : (
                          <ArrowUpFromLine size={13} />
                        )}
                        {h.type === 'import' ? 'Import' : 'Export'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--ink)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <FileSpreadsheet size={15} style={{ color: 'var(--red)' }} />
                        {h.fileName}
                      </span>
                    </td>
                    <td>{h.rows}</td>
                    <td>{formatTime(h.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
