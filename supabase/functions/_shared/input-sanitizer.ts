/**
 * Input Sanitization and Validation Utilities for Edge Functions
 * Prevents XSS, SQL injection, and other input-based attacks
 */

export interface SanitizationOptions {
  maxLength?: number;
  allowHTML?: boolean;
  allowSpecialChars?: boolean;
  trim?: boolean;
}

export class InputSanitizer {
  // HTML entities for encoding
  private static readonly HTML_ENTITIES: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  // SQL injection patterns (focused on real SQL constructs to avoid false positives)
  private static readonly SQL_INJECTION_PATTERNS = [
    /\bSELECT\b[\s\S]+?\bFROM\b/i,
    /\bINSERT\s+INTO\b/i,
    /\bUPDATE\b[\s\S]+?\bSET\b/i,
    /\bDELETE\s+FROM\b/i,
    /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i,
    /\bCREATE\s+(TABLE|DATABASE|SCHEMA|FUNCTION|PROCEDURE|TRIGGER)\b/i,
    /\bALTER\s+(TABLE|DATABASE|SCHEMA)\b/i,
    /\bEXEC(UTE)?\b/i,
    /\bUNION\b\s+SELECT\b/i,
    /(--|#|\/\*|\*\/)/,
    /(\bxp_\w+)/i,
    /(\bsp_\w+)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
  ];

  // XSS patterns
  private static readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^>]*>/gi,
    /data:text\/html/gi,
  ];

  // Path traversal patterns
  private static readonly PATH_TRAVERSAL_PATTERNS = [
    /\.\.(\/|\\)/g,
    /\.(\/|\\)/g,
    /%2e%2e%2f/gi,
    /%2e%2e%5c/gi,
    /%2e%2f/gi,
    /%2e%5c/gi,
  ];

  /**
   * Sanitizes a string by removing/encoding dangerous characters
   */
  static sanitizeString(
    input: string, 
    options: SanitizationOptions = {}
  ): string {
    const {
      maxLength = 10000,
      allowHTML = false,
      allowSpecialChars = true,
      trim = true,
    } = options;

    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    let sanitized = input;

    // Trim whitespace if requested
    if (trim) {
      sanitized = sanitized.trim();
    }

    // Enforce length limits
    if (sanitized.length > maxLength) {
      throw new Error(`Input exceeds maximum length of ${maxLength} characters`);
    }

    // Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // HTML encoding if HTML is not allowed
    if (!allowHTML) {
      sanitized = this.encodeHTML(sanitized);
    }

    // Remove special characters if not allowed
    if (!allowSpecialChars) {
      sanitized = sanitized.replace(/[^\w\s\-_.,!?]/g, '');
    }

    return sanitized;
  }

  /**
   * Encodes HTML entities
   */
  static encodeHTML(input: string): string {
    return input.replace(/[&<>"'\/]/g, (char) => this.HTML_ENTITIES[char] || char);
  }

  /**
   * Validates input against SQL injection patterns
   */
  static validateSQLInjection(input: string): { isValid: boolean; reason?: string } {
    for (const pattern of this.SQL_INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        return { isValid: false, reason: 'Potential SQL injection detected' };
      }
    }
    return { isValid: true };
  }

  /**
   * Validates input against XSS patterns
   */
  static validateXSS(input: string): { isValid: boolean; reason?: string } {
    for (const pattern of this.XSS_PATTERNS) {
      if (pattern.test(input)) {
        return { isValid: false, reason: 'Potential XSS attempt detected' };
      }
    }
    return { isValid: true };
  }

  /**
   * Validates input against path traversal patterns
   */
  static validatePathTraversal(input: string): { isValid: boolean; reason?: string } {
    for (const pattern of this.PATH_TRAVERSAL_PATTERNS) {
      if (pattern.test(input)) {
        return { isValid: false, reason: 'Potential path traversal detected' };
      }
    }
    return { isValid: true };
  }

  /**
   * Comprehensive input validation
   */
  static validateInput(
    input: string,
    options: SanitizationOptions = {}
  ): { isValid: boolean; sanitized?: string; errors: string[] } {
    const errors: string[] = [];

    try {
      // Basic sanitization
      const sanitized = this.sanitizeString(input, options);

      // Security validations
      const sqlCheck = this.validateSQLInjection(sanitized);
      if (!sqlCheck.isValid) {
        errors.push(sqlCheck.reason!);
      }

      const xssCheck = this.validateXSS(sanitized);
      if (!xssCheck.isValid) {
        errors.push(xssCheck.reason!);
      }

      const pathCheck = this.validatePathTraversal(sanitized);
      if (!pathCheck.isValid) {
        errors.push(pathCheck.reason!);
      }

      return {
        isValid: errors.length === 0,
        sanitized: errors.length === 0 ? sanitized : undefined,
        errors,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Sanitization failed');
      return { isValid: false, errors };
    }
  }

  /**
   * Sanitizes an object by validating all string properties
   */
  static sanitizeObject(
    obj: Record<string, any>,
    fieldOptions: Record<string, SanitizationOptions> = {}
  ): { isValid: boolean; sanitized?: Record<string, any>; errors: Record<string, string[]> } {
    const sanitized: Record<string, any> = {};
    const errors: Record<string, string[]> = {};
    let hasErrors = false;

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        const options = fieldOptions[key] || {};
        const validation = this.validateInput(value, options);

        if (validation.isValid) {
          sanitized[key] = validation.sanitized!;
        } else {
          errors[key] = validation.errors;
          hasErrors = true;
        }
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        // Numbers and booleans are safe to pass through
        sanitized[key] = value;
      } else if (value === null || value === undefined) {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        // Handle arrays of strings
        const sanitizedArray: any[] = [];
        const arrayErrors: string[] = [];

        for (let i = 0; i < value.length; i++) {
          if (typeof value[i] === 'string') {
            const arrayValidation = this.validateInput(value[i], fieldOptions[key] || {});
            if (arrayValidation.isValid) {
              sanitizedArray.push(arrayValidation.sanitized!);
            } else {
              arrayErrors.push(`Item ${i}: ${arrayValidation.errors.join(', ')}`);
            }
          } else {
            sanitizedArray.push(value[i]);
          }
        }

        if (arrayErrors.length > 0) {
          errors[key] = arrayErrors;
          hasErrors = true;
        } else {
          sanitized[key] = sanitizedArray;
        }
      } else {
        // For complex objects, skip or handle recursively
        errors[key] = ['Complex object types are not supported'];
        hasErrors = true;
      }
    }

    return {
      isValid: !hasErrors,
      sanitized: hasErrors ? undefined : sanitized,
      errors,
    };
  }

  /**
   * Validates and sanitizes email addresses
   */
  static validateEmail(email: string): { isValid: boolean; sanitized?: string; reason?: string } {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const sanitized = email.trim().toLowerCase();

    if (!emailRegex.test(sanitized)) {
      return { isValid: false, reason: 'Invalid email format' };
    }

    if (sanitized.length > 254) {
      return { isValid: false, reason: 'Email too long' };
    }

    return { isValid: true, sanitized };
  }

  /**
   * Validates UUID format
   */
  static validateUUID(uuid: string): { isValid: boolean; reason?: string } {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(uuid)) {
      return { isValid: false, reason: 'Invalid UUID format' };
    }

    return { isValid: true };
  }

  /**
   * Validates URL format
   */
  static validateURL(url: string): { isValid: boolean; reason?: string } {
    try {
      const parsed = new URL(url);
      
      // Only allow HTTP/HTTPS protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { isValid: false, reason: 'Only HTTP/HTTPS URLs are allowed' };
      }

      return { isValid: true };
    } catch {
      return { isValid: false, reason: 'Invalid URL format' };
    }
  }
}

// Export convenience functions
export const sanitizeString = InputSanitizer.sanitizeString;
export const sanitizeObject = InputSanitizer.sanitizeObject;
export const validateInput = InputSanitizer.validateInput;
export const validateEmail = InputSanitizer.validateEmail;
export const validateUUID = InputSanitizer.validateUUID;
export const validateURL = InputSanitizer.validateURL;

export default InputSanitizer;