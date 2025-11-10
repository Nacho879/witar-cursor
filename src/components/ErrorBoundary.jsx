import React from 'react'
import InternalServerError from '@/pages/errors/InternalServerError'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      // En desarrollo, mostrar detalles del error
      if (process.env.NODE_ENV === 'development' && this.state.error) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="text-center max-w-2xl mx-auto">
              <InternalServerError />
              <details className="mt-8 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground mb-2">
                  Detalles del error (solo desarrollo)
                </summary>
                <pre className="mt-2 p-4 bg-secondary rounded text-xs overflow-auto border border-border">
                  {this.state.error.toString()}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
                </pre>
              </details>
            </div>
          </div>
        );
      }
      
      return <InternalServerError />;
    }

    return this.props.children
  }
}

export default ErrorBoundary 