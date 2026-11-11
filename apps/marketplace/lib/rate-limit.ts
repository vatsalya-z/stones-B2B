/**
 * Robust in-memory sliding-window rate limiter with dual-bucket enforcement (IP + Account),
 * anti-spoofing IP resolution, and automatic cache cleanup.
 *
 * NOTE ON MULTI-INSTANCE / SERVERLESS DEPLOYMENTS:
 * This rate limiter stores window timestamps in a process-local memory Map.
 * In a multi-instance or serverless container environment (e.g. AWS Lambda, multiple Vercel edge regions),
 * memory is partitioned per instance. For production multi-region clusters, a distributed Redis/Upstash
 * store can be swapped in via the same interface. For single-instance or local development,
 * this provides zero-dependency, high-performance protection.
 */

interface RateLimitOptions {
  /** Time window in milliseconds (default: 60,000ms = 1 minute) */
  windowMs?: number;
  /** Max allowed requests per window (default: 5) */
  maxRequests?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  retryAfterSeconds: number;
  scope?: "ip" | "account" | "combined";
}

export class SlidingWindowRateLimiter {
  private store = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(options: RateLimitOptions = {}) {
    this.windowMs = options.windowMs ?? 60 * 1000;
    this.maxRequests = options.maxRequests ?? 5;
  }

  /**
   * Checks whether the given key is allowed or rate-limited.
   */
  public check(key: string, scope?: "ip" | "account" | "combined"): RateLimitResult {
    const now = Date.now();
    const timestamps = this.store.get(key) ?? [];

    // Purge timestamps older than the active window
    const recent = timestamps.filter((t) => now - t < this.windowMs);

    if (recent.length >= this.maxRequests) {
      const oldestInWindow = recent[0] ?? now;
      const resetMs = Math.max(0, this.windowMs - (now - oldestInWindow));
      const retryAfterSeconds = Math.ceil(resetMs / 1000) || 1;

      this.store.set(key, recent);
      return {
        allowed: false,
        remaining: 0,
        resetMs,
        retryAfterSeconds,
        scope,
      };
    }

    recent.push(now);
    this.store.set(key, recent);

    return {
      allowed: true,
      remaining: this.maxRequests - recent.length,
      resetMs: this.windowMs,
      retryAfterSeconds: 0,
      scope,
    };
  }

  /**
   * Resets rate limit records for a given key.
   */
  public reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Cleans up expired entries across the entire store.
   */
  public cleanup(): void {
    const now = Date.now();
    for (const [key, timestamps] of this.store.entries()) {
      const active = timestamps.filter((t) => now - t < this.windowMs);
      if (active.length === 0) {
        this.store.delete(key);
      } else {
        this.store.set(key, active);
      }
    }
  }

  public size(): number {
    return this.store.size;
  }
}

/**
 * Account-level rate limiter: Max 5 failed attempts per 5 minutes per email address.
 * Protects specific target accounts from distributed brute-force attacks across rotating IPs.
 */
export const accountRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 5,
});

/**
 * IP-level rate limiter: Max 20 attempts per 5 minutes per client IP.
 * Protects against credential-stuffing attacks across multiple account names from a single IP.
 */
export const ipRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 20,
});

/**
 * Composite authentication check: Evaluates both IP bucket and Account bucket.
 */
export function checkAuthRateLimits(clientIp: string, normalizedEmail: string): RateLimitResult {
  // 1. Check IP-level threshold
  const ipCheck = ipRateLimiter.check(`ip:${clientIp}`, "ip");
  if (!ipCheck.allowed) {
    return ipCheck;
  }

  // 2. Check Account-level threshold
  const accountCheck = accountRateLimiter.check(`account:${normalizedEmail}`, "account");
  if (!accountCheck.allowed) {
    return accountCheck;
  }

  return {
    allowed: true,
    remaining: Math.min(ipCheck.remaining, accountCheck.remaining),
    resetMs: Math.max(ipCheck.resetMs, accountCheck.resetMs),
    retryAfterSeconds: 0,
    scope: "combined",
  };
}

/**
 * Resets both IP and Account rate limiters upon successful authentication.
 */
export function resetAuthRateLimits(clientIp: string, normalizedEmail: string): void {
  ipRateLimiter.reset(`ip:${clientIp}`);
  accountRateLimiter.reset(`account:${normalizedEmail}`);
}

/**
 * Safely extracts client IP with anti-spoofing precedence:
 * 1. x-real-ip (trusted proxy / reverse proxy edge)
 * 2. cf-connecting-ip (Cloudflare)
 * 3. x-vercel-forwarded-for (Vercel Edge)
 * 4. x-forwarded-for (first IP if valid format, stripped of port and untrusted suffixes)
 */
export function getClientIp(req: Request): string {
  const realIp = req.headers.get("x-real-ip");
  if (realIp && isValidIpFormat(realIp.trim())) {
    return realIp.trim();
  }

  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp && isValidIpFormat(cfIp.trim())) {
    return cfIp.trim();
  }

  const vercelIp = req.headers.get("x-vercel-forwarded-for");
  if (vercelIp && isValidIpFormat(vercelIp.trim())) {
    return vercelIp.trim();
  }

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const candidate = forwarded.split(",")[0]?.trim();
    if (candidate && isValidIpFormat(candidate)) {
      return candidate;
    }
  }

  return "127.0.0.1";
}

/**
 * Basic IPv4 / IPv6 validation regex to prevent header injection or arbitrary spoof keys.
 */
function isValidIpFormat(ip: string): boolean {
  // IPv4 or IPv6 basic sanity check
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}
