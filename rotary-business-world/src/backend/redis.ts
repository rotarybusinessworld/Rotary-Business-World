import "server-only";
import { Redis } from "ioredis";

declare global {
  var _redis: Redis | null | undefined;
}

function createClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1, // fail fast — never stall a request waiting for Redis
    enableReadyCheck: false,
    // Without commandTimeout, a TCP-connected-but-slow Redis (e.g. loading AOF)
    // blocks indefinitely. 500ms is generous for a cache hit; anything longer
    // means Redis is unhealthy and the DB fallback is cheaper.
    commandTimeout: 500,
  });

  client.on("error", (err: Error) => {
    console.error("[redis]", err.message);
  });

  return client;
}

// In production: new client per process.
// In dev: reuse across HMR reloads to avoid exhausting connections.
export const redis: Redis | null =
  process.env.NODE_ENV === "production"
    ? createClient()
    : (global._redis ??= createClient());
