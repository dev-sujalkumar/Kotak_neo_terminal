export const logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, meta ? sanitize(meta) : '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, meta ? sanitize(meta) : '');
  },
  error: (message: string, meta?: any) => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, meta ? sanitize(meta) : '');
  },
  audit: (action: string, userId: string, details: string) => {
    console.log(`[AUDIT] [${new Date().toISOString()}] Action: ${action} | User: ${userId} | Details: ${details}`);
  }
};

function sanitize(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };
  const SENSITIVE_KEYS = ['mpin', 'totp', 'accessToken', 'sessionToken', 'sessionSid', 'password', 'passwordHash', 'secret', 'Auth'];
  
  for (const key of Object.keys(sanitized)) {
    if (SENSITIVE_KEYS.some(k => k.toLowerCase() === key.toLowerCase())) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitize(sanitized[key]);
    }
  }
  return sanitized;
}
