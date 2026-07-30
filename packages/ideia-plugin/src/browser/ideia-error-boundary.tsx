import * as React from 'react';
import { createLogger } from '@ideia/logger';

const log = createLogger('ideia-plugin:error-boundary');

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    log.error('[ErrorBoundary] ' + error.message, { componentStack: errorInfo.componentStack });
    this.props.onError?.(error, errorInfo);
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{ padding: '20px', textAlign: 'center' as const }}>
          <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>\u26A0\uFE0F</div>
          <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600 }}>Something went wrong</h3>
          <p style={{ margin: '0 0 12px', fontSize: '12px', opacity: 0.7 }}>{this.state.error?.message ?? 'Unknown error'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '6px 16px', cursor: 'pointer', border: 'none', borderRadius: '4px',
              background: 'var(--theia-button-background)', color: 'var(--theia-button-foreground)',
            }}
          >Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
