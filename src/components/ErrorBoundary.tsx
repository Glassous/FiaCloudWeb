import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
          return this.props.fallback;
      }
      return (
        <div style={{ 
            padding: '24px', 
            color: 'var(--text-primary)', 
            textAlign: 'center',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '16px'
        }}>
            <div style={{ fontSize: '48px' }}>⚠️</div>
            <h3 style={{ margin: 0 }}>Something went wrong</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', wordBreak: 'break-word' }}>
                {this.state.error?.message}
            </p>
            <button 
                onClick={() => this.setState({ hasError: false })}
                className="glass-button"
                style={{ padding: '8px 16px' }}
            >
                Try again
            </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
