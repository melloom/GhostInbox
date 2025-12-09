/**
 * Secure logging utility
 * Prevents logging sensitive information in production
 */

const isDevelopment = import.meta.env.DEV

/**
 * Log error securely (only in development)
 */
export function logError(error: any, context?: string): void {
  if (isDevelopment) {
    console.error(`[${context || 'Error'}]`, error)
  }
  // In production, you might want to send to error tracking service
  // e.g., Sentry, LogRocket, etc.
}

/**
 * Log warning securely
 */
export function logWarning(message: string, context?: string): void {
  if (isDevelopment) {
    console.warn(`[${context || 'Warning'}]`, message)
  }
}

/**
 * Log info (only in development)
 */
export function logInfo(message: string, context?: string): void {
  if (isDevelopment) {
    console.log(`[${context || 'Info'}]`, message)
  }
}

