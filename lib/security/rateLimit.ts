interface RateLimitEntry {
    count: number;
    resetAt: number;
}

interface RateLimitResult {
    allowed: boolean;
    retryAfterSeconds: number;
}

const globalForRateLimit = globalThis as typeof globalThis & {
    __authRateLimitStore?: Map<string, RateLimitEntry>;
};

// In-memory limiter for this runtime instance. Replace with Redis for multi-instance deployments.
const rateLimitStore =
    globalForRateLimit.__authRateLimitStore ?? new Map<string, RateLimitEntry>();

if (!globalForRateLimit.__authRateLimitStore) {
    globalForRateLimit.__authRateLimitStore = rateLimitStore;
}

function cleanupExpiredEntries(now: number) {
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetAt <= now) {
            rateLimitStore.delete(key);
        }
    }
}

export function consumeRateLimit(
    key: string,
    maxRequests: number,
    windowMs: number
): RateLimitResult {
    const now = Date.now();
    cleanupExpiredEntries(now);

    const entry = rateLimitStore.get(key);
    if (!entry || entry.resetAt <= now) {
        rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
    }

    if (entry.count >= maxRequests) {
        return {
            allowed: false,
            retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
        };
    }

    entry.count += 1;
    rateLimitStore.set(key, entry);
    return { allowed: true, retryAfterSeconds: 0 };
}
