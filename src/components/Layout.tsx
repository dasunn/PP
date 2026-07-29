import { type ReactNode, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Table2,
  Users,
  History,
  Menu,
  X,
  CalendarClock,
  CalendarRange,
} from 'lucide-react'
import ErrorBoundary from './ErrorBoundary'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/tna-plan', label: 'T&A Plan', icon: CalendarRange, end: false },
  { to: '/preprod', label: 'Pre-Prod Chart', icon: Table2, end: false },
  { to: '/tna-setup', label: 'T&A Setup', icon: CalendarClock, end: false },
  { to: '/merchants', label: 'Merchants', icon: Users, end: false },
  { to: '/history', label: 'History', icon: History, end: false },
]

interface Props {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  /** Fit the content to the viewport and let a single pane inside it scroll. */
  fill?: boolean
}

export default function Layout({ title, subtitle, actions, children, fill }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="app">
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">P</div>
          <div className="brand-text">
            <b>Pre-Prod</b>
            <span>Garment Manufacturing</span>
          </div>
        </div>
        <nav className="nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)}>
              <l.icon size={18} />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">Pre-Prod Dashboard · MVP v1.0</div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="btn icon-btn btn-ghost menu-btn"
              onClick={() => setOpen((o) => !o)}
              aria-label="Menu"
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div>
              <h1>{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="topbar-actions">{actions}</div>}
        </header>
        <main className={`page${fill ? ' page-fill' : ''}`}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
