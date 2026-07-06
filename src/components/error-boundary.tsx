'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * React Error Boundary that catches JavaScript errors anywhere in the child
 * component tree, logs those errors, and displays a fallback UI.
 * 
 * This prevents the entire application from crashing due to a single component failure.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to console with full context
    console.error('[ErrorBoundary] Uncaught error:', {
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // Store error info for potential debugging
    this.setState({ errorInfo });

    // In production, you could send this to a logging service
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-muted/30 rounded-lg border">
          <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
            {this.props.fallbackMessage || 
              'An unexpected error occurred. You can try again or continue with other parts of the application.'}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={this.handleReset}
              className="gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
          {/* Show error details in development */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4 p-3 bg-destructive/10 rounded text-xs max-w-full overflow-auto">
              <summary className="cursor-pointer font-medium text-destructive">
                Error Details (Dev Only)
              </summary>
              <pre className="mt-2 whitespace-pre-wrap">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap any component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallbackMessage?: string,
  onReset?: () => void
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallbackMessage={fallbackMessage} onReset={onReset}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}