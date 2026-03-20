import { Component, ReactNode, ErrorInfo } from 'react'
import { IconRelief } from './Icons'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  tabName?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.tabName ? ' ' + this.props.tabName : ''}]`, error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{ fontSize: '2.5rem' }}><IconRelief size={40} /></div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {this.props.tabName ? `${this.props.tabName} ran into a problem` : 'Something went wrong'}
          </div>
          <div style={{ fontSize: '0.85rem', maxWidth: '320px', lineHeight: 1.5 }}>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </div>
          <button
            className="soft-button"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
