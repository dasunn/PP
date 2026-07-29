import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Without this, one component throwing unmounts the whole app and leaves a
 * blank white page with nothing to go on. Keep the shell and show what broke.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="grid-wrap">
        <div className="empty">
          <div className="empty-ico">
            <AlertTriangle size={30} />
          </div>
          <h3>Something went wrong on this page</h3>
          <p>
            The rest of the app is still fine — switch pages, or reload to try again.
          </p>
          <pre className="error-detail">{error.message}</pre>
          <button className="btn" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      </div>
    )
  }
}
