/**
 * Security Middleware for OSU PAL
 * 
 * This middleware provides additional security measures including:
 * - Security headers
 * - Request logging for monitoring
 * - IP blacklisting capability
 * - Enhanced error handling
 */

// Simple blacklist store (in production, use Redis or database)
const blacklistedIPs = new Set<string>();

// Track suspicious behavior
interface SuspiciousActivity {
  failedAttempts: number;
  lastAttempt: number;
}

const suspiciousIPs = new Map<string, SuspiciousActivity>();

/**
 * Add an IP to the blacklist temporarily
 */
export function blacklistIP(ip: string, durationMs: number = 60 * 60 * 1000) { // Default 1 hour
  blacklistedIPs.add(ip);
  
  // Auto-remove after duration
  setTimeout(() => {
    blacklistedIPs.delete(ip);
  }, durationMs);
  
  console.log(`IP ${ip} temporarily blacklisted for ${durationMs / 1000} seconds`);
}

/**
 * Check if an IP is blacklisted
 */
export function isBlacklisted(ip: string): boolean {
  return blacklistedIPs.has(ip);
}

/**
 * Track suspicious activity and auto-blacklist if needed
 */
export function trackSuspiciousActivity(ip: string): boolean {
  const now = Date.now();
  const activity = suspiciousIPs.get(ip) || { failedAttempts: 0, lastAttempt: 0 };
  
  // Reset counter if last attempt was over 1 hour ago
  if (now - activity.lastAttempt > 60 * 60 * 1000) {
    activity.failedAttempts = 1;
  } else {
    activity.failedAttempts++;
  }
  
  activity.lastAttempt = now;
  suspiciousIPs.set(ip, activity);
  
  // Auto-blacklist after 10 failed attempts within 1 hour
  if (activity.failedAttempts >= 10) {
    blacklistIP(ip, 24 * 60 * 60 * 1000); // 24 hour blacklist
    suspiciousIPs.delete(ip); // Clear from suspicious list
    return true; // Indicate IP was blacklisted
  }
  
  return false;
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(headers: Headers): void {
  // Prevent clickjacking
  headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  headers.set('X-Content-Type-Options', 'nosniff');
  
  // XSS protection
  headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy (basic)
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com;"
  );
  
  // Cache control for sensitive endpoints
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');
}

/**
 * Enhanced logging for security monitoring
 */
export function logSecurityEvent(event: {
  type: 'rate_limit' | 'turnstile_fail' | 'validation_error' | 'blacklist' | 'suspicious';
  ip: string;
  userAgent?: string;
  endpoint: string;
  details?: any;
}): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    ...event,
    severity: getSeverityLevel(event.type)
  };
  
  // In production, send to logging service (e.g., Datadog, LogRocket, etc.)
  console.log(`[SECURITY] ${JSON.stringify(logEntry)}`);
  
  // Track patterns for auto-blacklisting
  if (['turnstile_fail', 'rate_limit', 'validation_error'].includes(event.type)) {
    const wasBlacklisted = trackSuspiciousActivity(event.ip);
    if (wasBlacklisted) {
      console.log(`[SECURITY] Auto-blacklisted IP ${event.ip} due to repeated violations`);
    }
  }
}

function getSeverityLevel(type: string): 'low' | 'medium' | 'high' {
  switch (type) {
    case 'blacklist':
      return 'high';
    case 'suspicious':
    case 'turnstile_fail':
      return 'medium';
    case 'rate_limit':
    case 'validation_error':
      return 'low';
    default:
      return 'low';
  }
}

/**
 * Comprehensive security check for API endpoints
 */
export function performSecurityChecks(
  request: Request,
  ip: string,
  endpoint: string
): { allowed: boolean; reason?: string } {
  
  // Check if IP is blacklisted
  if (isBlacklisted(ip)) {
    logSecurityEvent({
      type: 'blacklist',
      ip,
      endpoint,
      details: 'Blocked blacklisted IP'
    });
    return { allowed: false, reason: 'IP temporarily blocked due to suspicious activity' };
  }
  
  // Check for suspicious patterns in headers
  const userAgent = request.headers.get('user-agent') || '';
  if (userAgent.length < 10 || userAgent.includes('bot') || userAgent.includes('crawler')) {
    logSecurityEvent({
      type: 'suspicious',
      ip,
      userAgent,
      endpoint,
      details: 'Suspicious user agent'
    });
    // Don't block but log - some legitimate requests might have short user agents
  }
  
  return { allowed: true };
}