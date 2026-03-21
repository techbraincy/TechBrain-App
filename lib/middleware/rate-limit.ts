/**
 * IP-based rate limiter for the login endpoint.
 *
 * Uses Upstash Redis + @upstash/ratelimit for a shared counter
 * across all Vercel serverless instances.
 *
 * If Upstash env vars are not set (e.g. local dev), the limiter
 * is bypassed and all requests are allowed through.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let ratelimit: Ratelimit | null = null;

function getRatelimiter(): Ratelimit | null {
  if (ratelimit) return ratelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    analytics: false,
    prefix: "login_rl",
  });
  return ratelimit;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number; // Unix timestamp (ms)
}

/**
 * Check if a given IP is rate-limited.
 * Returns { allowed: true } if Upstash is not configured.
 */
export async function checkLoginRateLimit(ip: string): Promise<RateLimitResult> {
  const limiter = getRatelimiter();
  if (!limiter) {
    return { allowed: true, remaining: 999, reset: 0 };
  }

  const result = await limiter.limit(ip);
  return {
    allowed: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}
