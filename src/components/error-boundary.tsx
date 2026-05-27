'use client';

import { Component, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  resetKey: number;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo.componentStack);
  }

  private handleReset = () => {
    this.setState((prev) => ({ hasError: false, error: null, resetKey: prev.resetKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center" role="alert" aria-live="assertive" aria-atomic="true">
          <div className="p-3 rounded-full bg-destructive/10 border border-destructive/20 mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-sm font-medium mb-1">Something went wrong</h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-md">
            An unexpected error occurred. You can try reloading this section.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
          >
            Try Again
          </Button>
        </div>
      );
    }

    return <div key={this.state.resetKey}>{this.props.children}</div>;
  }
}