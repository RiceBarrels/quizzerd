/**
 * Simple in-memory rate limiter for API routes
 * For production with multiple instances, consider using Upstash Redis
 */

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per interval
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (works for single instance deployments)
// For multi-instance, use Upstash Redis or similar
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
const CLEANUP_INTERVAL = 60000; // 1 minute
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now >= entry.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

startCleanup();

/**
 * Rate limit presets for different use cases
 */
export const RATE_LIMITS = {
  // General API endpoints
  api: {
    interval: 60000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  },
  // Authentication endpoints (stricter)
  auth: {
    interval: 60000, // 1 minute
    maxRequests: 10, // 10 requests per minute
  },
  // Exam submission (stricter to prevent spam)
  submit: {
    interval: 60000, // 1 minute
    maxRequests: 5, // 5 submissions per minute
  },
  // Read-heavy endpoints (more lenient)
  read: {
    interval: 60000, // 1 minute
    maxRequests: 120, // 120 requests per minute
  },
} as const;

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when limit resets
}

/**
 * Check if a request should be rate limited
 * @param identifier Unique identifier for the client (IP, user ID, etc.)
 * @param config Rate limit configuration
 * @returns RateLimitResult with success status and metadata
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.api
): RateLimitResult {
  const now = Date.now();
  const key = identifier;

  let entry = rateLimitStore.get(key);

  // If no entry or entry has expired, create new one
  if (!entry || now >= entry.resetAt) {
    entry = {
      count: 1,
      resetAt: now + config.interval,
    };
    rateLimitStore.set(key, entry);

    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset: Math.floor(entry.resetAt / 1000),
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  const remaining = Math.max(0, config.maxRequests - entry.count);
  const success = entry.count <= config.maxRequests;

  return {
    success,
    limit: config.maxRequests,
    remaining,
    reset: Math.floor(entry.resetAt / 1000),
  };
}

/**
 * Create rate limit headers for response
 */
export function rateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.reset.toString());
  return headers;
}

/**
 * Get client identifier from request
 * Uses IP address with fallback to user agent hash
 */
export function getClientIdentifier(request: Request): string {
  // Try various headers for client IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  // Get first IP from forwarded-for header
  const ip = cfConnectingIp ||
    realIp ||
    (forwardedFor ? forwardedFor.split(',')[0].trim() : null);

  if (ip) {
    return `ip:${ip}`;
  }

  // Fallback to user agent (less reliable but better than nothing)
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return `ua:${hashString(userAgent)}`;
}

/**
 * Simple string hash function
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get rate limit config for a given pathname
 */
export function getRateLimitConfig(pathname: string): RateLimitConfig {
  // Authentication endpoints
  if (pathname.includes('/api/auth') || pathname.includes('/sign-in') || pathname.includes('/sign-up')) {
    return RATE_LIMITS.auth;
  }

  // Submission endpoints (stricter)
  if (pathname.includes('/submit') || pathname.includes('/create') || pathname.includes('/publish')) {
    return RATE_LIMITS.submit;
  }

  // Read endpoints (more lenient)
  if (pathname.includes('/get') || pathname.includes('/list')) {
    return RATE_LIMITS.read;
  }

  // Default API rate limit
  return RATE_LIMITS.api;
}
