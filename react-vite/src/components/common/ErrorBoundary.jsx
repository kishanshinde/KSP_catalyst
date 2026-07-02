import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 text-center">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant dark:text-slate-400 mb-4">error_outline</span>
          <h2 className="text-lg font-bold text-on-surface dark:text-slate-200 mb-2">Something went wrong</h2>
          <p className="text-sm text-on-surface-variant dark:text-slate-400 mb-4 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            Reload page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
