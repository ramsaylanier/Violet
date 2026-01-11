/**
 * Cookie utilities to replace @tanstack/react-start/server cookie functions
 */

const SESSION_COOKIE_NAME = "auth_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export { SESSION_COOKIE_NAME, COOKIE_MAX_AGE };

/**
 * Parse cookie string and get a specific cookie value
 */
export function getCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) {
      acc[key] = decodeURIComponent(value);
    }
    return acc;
  }, {} as Record<string, string>);
  
  return cookies[name] || null;
}

/**
 * Create a Set-Cookie header value
 */
export function setCookie(name: string, value: string, options: {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  path?: string;
  maxAge?: number;
}): string {
  const parts: string[] = [`${name}=${encodeURIComponent(value)}`];
  
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  
  if (options.path) {
    parts.push(`Path=${options.path}`);
  }
  
  if (options.httpOnly) {
    parts.push('HttpOnly');
  }
  
  if (options.secure) {
    parts.push('Secure');
  }
  
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }
  
  return parts.join('; ');
}
