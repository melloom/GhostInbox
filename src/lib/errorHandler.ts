/**
 * Error handling utilities for secure error messages
 * Prevents information leakage to users
 */

/**
 * Sanitize error messages to prevent information disclosure
 * Returns user-friendly generic messages instead of detailed errors
 */
export function sanitizeErrorMessage(error: any): string {
  // If it's already a sanitized user message, return it
  if (typeof error === 'string' && !error.includes('Error:') && !error.includes('at ')) {
    return error
  }

  // Extract error message
  const errorMessage = error?.message || error?.toString() || 'An error occurred'

  // List of sensitive patterns that should be hidden
  const sensitivePatterns = [
    /database/i,
    /sql/i,
    /connection/i,
    /timeout/i,
    /credentials/i,
    /password/i,
    /api[_-]?key/i,
    /token/i,
    /secret/i,
    /unauthorized/i,
    /forbidden/i,
    /internal server/i,
    /stack trace/i,
    /at \w+\.\w+/i, // Stack trace patterns
    /file:\/\//i, // File paths
    /\/Users\/|\/home\//i, // User paths
  ]

  // Check if error contains sensitive information
  const containsSensitiveInfo = sensitivePatterns.some(pattern => pattern.test(errorMessage))

  // Generic error messages based on error type
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'Network error. Please check your connection and try again.'
  }

  if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
    return 'Too many requests. Please try again later.'
  }

  if (errorMessage.includes('not found') || errorMessage.includes('404')) {
    return 'Resource not found.'
  }

  if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
    return 'Please log in to continue.'
  }

  if (errorMessage.includes('forbidden') || errorMessage.includes('403')) {
    return 'You do not have permission to perform this action.'
  }

  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    // Validation errors are usually safe to show
    return errorMessage
  }

  // If contains sensitive info, return generic message
  if (containsSensitiveInfo) {
    return 'Something went wrong. Please try again later.'
  }

  // For known safe errors, return as-is
  const safeErrors = [
    'Message cannot be empty',
    'Handle is required',
    'Email is required',
    'Password is required',
    'Invalid email address',
    'Password must be at least 8 characters',
  ]

  if (safeErrors.some(safe => errorMessage.includes(safe))) {
    return errorMessage
  }

  // Default: return generic message
  return 'Something went wrong. Please try again.'
}

/**
 * Log error securely (for debugging, not shown to users)
 * @deprecated Use logger.ts instead
 */
export function logError(error: any, context?: string): void {
  if (import.meta.env.DEV) {
    // Only log in development
    console.error(`[${context || 'Error'}]`, error)
  }
  // In production, you might want to send to error tracking service
  // e.g., Sentry, LogRocket, etc.
}

/**
 * Handle and sanitize errors from async operations
 */
export async function handleAsyncError<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await operation()
    return { data, error: null }
  } catch (error: any) {
    logError(error, context)
    const sanitizedError = sanitizeErrorMessage(error)
    return { data: null, error: sanitizedError }
  }
}

