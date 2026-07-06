'use client';

import { useEffect } from 'react';

/**
 * Global error handler hook that catches:
 * - Unhandled JavaScript exceptions
 * - Unhandled promise rejections
 * 
 * Logs these errors to console with full context for debugging.
 * In production, this could be extended to send to a logging service.
 */
export function useGlobalErrorHandler() {
  useEffect(() => {
    // Handle uncaught JavaScript errors
    const handleError = (event: ErrorEvent) => {
      console.error('[GlobalErrorHandler] Uncaught error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });

      // Prevent the default browser error page
      // event.preventDefault();

      // In production, you could send this to a logging service
      // logErrorToService(event.error, { 
      //   type: 'uncaught_exception',
      //   filename: event.filename,
      //   lineno: event.lineno,
      // });
    };

    // Handle unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('[GlobalErrorHandler] Unhandled promise rejection:', {
        reason: event.reason?.toString?.() || event.reason,
        stack: event.reason?.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });

      // Prevent the default browser error page
      // event.preventDefault();

      // In production, you could send this to a logging service
      // logErrorToService(event.reason, { 
      //   type: 'unhandled_rejection',
      // });
    };

    // Add event listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    // Cleanup
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);
}

/**
 * Log error with full context
 */
export function logError(
  error: Error | unknown,
  context: {
    component?: string;
    action?: string;
    route?: string;
    additionalInfo?: Record<string, unknown>;
  }
) {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  console.error('[ErrorLog]', {
    error: errorObj.toString(),
    stack: errorObj.stack,
    message: errorObj.message,
    name: errorObj.name,
    ...context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
  });
}