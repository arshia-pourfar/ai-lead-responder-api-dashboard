import type { AiProvider } from "@/lib/services/userSettings";

interface AiQuotaCooldownEntry {
    expiresAt: number;
    reason: string;
}

export interface AiQuotaCooldownState {
    isActive: boolean;
    expiresAt: number;
    retryAfterMs: number;
    reason: string;
}

const MIN_COOLDOWN_MS = 60_000;
const CLEANUP_INTERVAL_MS = 60_000;

function parseCooldownMs(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value || "", 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
}

const DEFAULT_COOLDOWN_MS = parseCooldownMs(
    process.env.AI_QUOTA_COOLDOWN_MS,
    60 * 60 * 1000
);
const DAILY_HINT_COOLDOWN_MS = parseCooldownMs(
    process.env.AI_DAILY_QUOTA_COOLDOWN_MS,
    6 * 60 * 60 * 1000
);
const MAX_COOLDOWN_MS = parseCooldownMs(
    process.env.AI_QUOTA_MAX_COOLDOWN_MS,
    24 * 60 * 60 * 1000
);

const DAILY_HINT_KEYWORDS = [
    "daily",
    "per day",
    "24h",
    "24 hour",
    "24-hour",
];

const globalForAiQuotaCooldown = globalThis as unknown as {
    __aiQuotaCooldownStore?: Map<string, AiQuotaCooldownEntry>;
    __aiQuotaCooldownLastCleanupAt?: number;
};

const aiQuotaCooldownStore =
    globalForAiQuotaCooldown.__aiQuotaCooldownStore ?? new Map<string, AiQuotaCooldownEntry>();

if (!globalForAiQuotaCooldown.__aiQuotaCooldownStore) {
    globalForAiQuotaCooldown.__aiQuotaCooldownStore = aiQuotaCooldownStore;
}

if (typeof globalForAiQuotaCooldown.__aiQuotaCooldownLastCleanupAt !== "number") {
    globalForAiQuotaCooldown.__aiQuotaCooldownLastCleanupAt = 0;
}

function buildScopeKey(provider: AiProvider, userId?: string): string {
    const normalizedUserId = (userId || "").trim() || "global";
    return `${provider}:${normalizedUserId}`;
}

function normalizeReason(details: string | undefined, status: number | undefined): string {
    const text = (details || "").trim();
    if (text) return text;
    if (status === 429) return "HTTP 429";
    return "AI quota or rate limit reached.";
}

function isLikelyDailyQuota(details: string | undefined): boolean {
    const normalized = (details || "").toLowerCase();
    if (!normalized) return false;
    return DAILY_HINT_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function sanitizeDuration(durationMs: number): number {
    const normalized = Number.isFinite(durationMs) ? Math.floor(durationMs) : DEFAULT_COOLDOWN_MS;
    return Math.min(Math.max(normalized, MIN_COOLDOWN_MS), MAX_COOLDOWN_MS);
}

function cleanupExpiredEntries(now: number): void {
    const lastCleanupAt = globalForAiQuotaCooldown.__aiQuotaCooldownLastCleanupAt || 0;
    if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;

    for (const [key, entry] of aiQuotaCooldownStore.entries()) {
        if (entry.expiresAt <= now) {
            aiQuotaCooldownStore.delete(key);
        }
    }

    globalForAiQuotaCooldown.__aiQuotaCooldownLastCleanupAt = now;
}

export function getAiQuotaCooldownState(
    provider: AiProvider,
    userId?: string
): AiQuotaCooldownState | null {
    const now = Date.now();
    cleanupExpiredEntries(now);

    const key = buildScopeKey(provider, userId);
    const entry = aiQuotaCooldownStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= now) {
        aiQuotaCooldownStore.delete(key);
        return null;
    }

    return {
        isActive: true,
        expiresAt: entry.expiresAt,
        retryAfterMs: Math.max(0, entry.expiresAt - now),
        reason: entry.reason,
    };
}

export function activateAiQuotaCooldown(params: {
    provider: AiProvider;
    userId?: string;
    details?: string;
    status?: number;
}): AiQuotaCooldownState {
    const now = Date.now();
    cleanupExpiredEntries(now);

    const key = buildScopeKey(params.provider, params.userId);
    const existing = aiQuotaCooldownStore.get(key);
    const baseDurationMs = isLikelyDailyQuota(params.details)
        ? DAILY_HINT_COOLDOWN_MS
        : DEFAULT_COOLDOWN_MS;
    const durationMs = sanitizeDuration(baseDurationMs);
    const nextExpiresAt = now + durationMs;
    const expiresAt =
        existing && existing.expiresAt > now
            ? Math.max(existing.expiresAt, nextExpiresAt)
            : nextExpiresAt;

    const reason = normalizeReason(params.details, params.status);
    aiQuotaCooldownStore.set(key, { expiresAt, reason });

    return {
        isActive: true,
        expiresAt,
        retryAfterMs: Math.max(0, expiresAt - now),
        reason,
    };
}

export function clearAiQuotaCooldown(provider: AiProvider, userId?: string): void {
    const key = buildScopeKey(provider, userId);
    aiQuotaCooldownStore.delete(key);
}
