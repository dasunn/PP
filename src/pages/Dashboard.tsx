import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Layers,
  Users,
  Globe2,
  Clock,
  Plus,
  ArrowRight,
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
import type { PreProdRow } from '../types'

const RED = '#ec1e2f'
const PALETTE = ['#ec1e2f', '#f4525f', '#f9838d', '#c4141f', '#ffb0b6', '#8a0f18']

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

export default function Dashboard() {
  const { preProdRows, merchants, history } = useStore()

  const stats = useMemo(() => {
    const destinations = new Set<string>()
    preProdRows.forEach((r) => r.destinations.forEach((d) => destinations.add(d.toLowerCase())))
    const pendingSo = preProdRows.filter(
      (r) => !/approv|done|complete|ok|yes/i.test(r.graphicSoApproval),
    ).length
    return {
      styles: preProdRows.length,
      merchants: merchants.length,
      destinations: destinations.size,
      pendingSo,
    }
  }, [preProdRows, merchants])

  const newRepeat = useMemo(
    () => countBy(preProdRows, (r) => normalizeNewRepeat(r.newRepeat)),
    [preProdRows],
  )
  const byPlant = useMemo(() => countBy(preProdRows, (r) => r.prodPlant).slice(0, 6), [preProdRows])
  const byMerchant = useMemo(() => countBy(preProdRows, (r) => r.merchant).slice(0, 6), [preProdRows])
  const soStatus = useMemo(() => countBy(preProdRows, (r) => r.graphicSoApproval), [preProdRows])
  const topDest = useMemo(() => countByMulti(preProdRows, (r) => r.destinations).slice(0, 7), [preProdRows])
  const topColors = useMemo(() => countByMulti(preProdRows, (r) => r.ppColors).slice(0, 7), [preProdRows])

  const cards = [
    { label: 'Total Styles', value: stats.styles, icon: Layers },
    { label: 'Merchants', value: stats.merchants, icon: Users },
    { label: 'Destinations Covered', value: stats.destinations, icon: Globe2 },
    { label: 'Pending SO Approval', value: stats.pendingSo, icon: Clock },
  ]

  const empty = preProdRows.length === 0

  return (
    <Layout title="Dashboard" subtitle="Overview of your pre-production pipeline.">
      <div className="stat-grid">
        {cards.map((c) => (
          <div className="stat" key={c.label}>
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
      ) : (
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
              <Tooltip cursor={{ fill: '#fbeff0' }} />
              <Bar dataKey="value" fill={RED} radius={[0, 6, 6, 0]} barSize={18} />
            </BarChart>
          </ChartCard>

          <ChartCard title="Styles by Production Plant" sub="Top plants">
            <BarChart data={byPlant} margin={{ top: 6 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip cursor={{ fill: '#fbeff0' }} />
              <Bar dataKey="value" fill="#f4525f" radius={[6, 6, 0, 0]} barSize={30} />
            </BarChart>
          </ChartCard>

          <ChartCard title="Styles by Merchant" sub="Workload per merchant">
            <BarChart data={byMerchant} margin={{ top: 6 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip cursor={{ fill: '#fbeff0' }} />
              <Bar dataKey="value" fill="#c4141f" radius={[6, 6, 0, 0]} barSize={30} />
            </BarChart>
          </ChartCard>

          <ChartCard title="PP Colour Spread" sub="Most requested PP colours" className="col-span-2">
            <BarChart data={topColors} margin={{ top: 6 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip cursor={{ fill: '#fbeff0' }} />
              <Bar dataKey="value" fill="#f9838d" radius={[6, 6, 0, 0]} barSize={26} />
            </BarChart>
          </ChartCard>
        </div>
      )}

      {history.length > 0 && (
        <p style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 20 }}>
          {history.length} import/export event{history.length === 1 ? '' : 's'} logged —{' '}
          <Link to="/history" style={{ color: 'var(--red)', fontWeight: 600 }}>
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
