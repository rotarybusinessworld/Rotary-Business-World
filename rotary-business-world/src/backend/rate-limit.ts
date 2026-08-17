import "server-only";
import { redis } from "@/backend/redis";

/**
 * Fixed-window rate limiter using Redis INCR + EXPIRE.
 *
 * When Redis is unavailable (REDIS_URL not set, or connection lost), returns
 * { allowed: true } — rate limiting degrades gracefully rather than blocking
 * all requests.
 */
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSecs: number,
): Promise<{ allowed: boolean; remaining: number }> {
  if (!redis) return { allowed: true, remaining: limit };

  const key = `rate:${identifier}`;
  try {
    // Lua script keeps INCR + EXPIRE atomic. Setting EXPIRE only on c==1
    // is the fast path, but a key restored from Redis AOF crash-recovery
    // can have count > 1 and no TTL, which permanently locks out the
    // identifier. The TTL==-1 branch catches that case.
    const count = (await redis.eval(
      `local c = redis.call('INCR', KEYS[1])
       if c == 1 or redis.call('TTL', KEYS[1]) == -1 then
         redis.call('EXPIRE', KEYS[1], ARGV[1])
       end
       return c`,
      1,
      key,
      String(windowSecs),
    )) as number;
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  } catch {
    return { allowed: true, remaining: limit };
  }
}
