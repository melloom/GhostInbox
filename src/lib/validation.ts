/**
 * Security and validation utilities for GhostInbox
 */

/**
 * Sanitize user input to prevent XSS attacks
 * Enhanced version with more comprehensive protection
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove script tags and event handlers (more comprehensive)
  sanitized = sanitized
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove dangerous URL schemes
  sanitized = sanitized.replace(/^\s*(javascript|vbscript|data|file):/gi, '');
  
  // Remove SQL injection patterns (basic)
  sanitized = sanitized.replace(/('|(\\')|(;)|(\\)|(\/\*)|(\*\/)|(\-\-))/g, '');
  
  // Trim whitespace
  return sanitized.trim();
}

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

/**
 * Validate message content
 */
export function validateMessage(message: string): { valid: boolean; error?: string } {
  if (!message || !message.trim()) {
    return { valid: false, error: 'Message cannot be empty' };
  }

  const trimmed = message.trim();
  const maxLength = 5000;
  
  if (trimmed.length > maxLength) {
    return { valid: false, error: `Message must be ${maxLength} characters or less` };
  }

  if (trimmed.length < 1) {
    return { valid: false, error: 'Message must be at least 1 character' };
  }

  // Check for suspicious patterns (basic)
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(trimmed)) {
      return { valid: false, error: 'Message contains invalid content' };
    }
  }

  return { valid: true };
}

/**
 * Validate handle (username)
 */
export function validateHandle(handle: string): { valid: boolean; error?: string } {
  if (!handle || !handle.trim()) {
    return { valid: false, error: 'Handle cannot be empty' };
  }

  const trimmed = handle.trim().toLowerCase();
  const minLength = 3;
  const maxLength = 30;

  if (trimmed.length < minLength) {
    return { valid: false, error: `Handle must be at least ${minLength} characters` };
  }

  if (trimmed.length > maxLength) {
    return { valid: false, error: `Handle must be ${maxLength} characters or less` };
  }

  // Only allow alphanumeric characters, underscores, and hyphens
  const handleRegex = /^[a-z0-9_-]+$/;
  if (!handleRegex.test(trimmed)) {
    return { valid: false, error: 'Handle can only contain letters, numbers, underscores, and hyphens' };
  }

  // Reserved words
  const reservedWords = ['admin', 'api', 'www', 'mail', 'ftp', 'localhost', 'root', 'administrator'];
  if (reservedWords.includes(trimmed)) {
    return { valid: false, error: 'This handle is reserved' };
  }

  return { valid: true };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || !email.trim()) {
    return { valid: false, error: 'Email cannot be empty' };
  }

  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  if (trimmed.length > 254) {
    return { valid: false, error: 'Email address is too long' };
  }

  return { valid: true };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password) {
    return { valid: false, error: 'Password cannot be empty' };
  }

  const minLength = 8;
  if (password.length < minLength) {
    return { valid: false, error: `Password must be at least ${minLength} characters` };
  }

  // Check for at least one number and one letter
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  
  if (!hasNumber || !hasLetter) {
    return { valid: false, error: 'Password must contain at least one letter and one number' };
  }

  return { valid: true };
}

/**
 * Sanitize and validate message before storage
 */
export function prepareMessageForStorage(message: string): { sanitized: string; error?: string } {
  const validation = validateMessage(message);
  if (!validation.valid) {
    return { sanitized: '', error: validation.error };
  }

  const sanitized = sanitizeInput(message);
  return { sanitized };
}

/**
 * Normalize handle (lowercase, trim)
 */
export function normalizeHandle(handle: string): string {
  return handle.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

