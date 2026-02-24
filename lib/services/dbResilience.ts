import { Prisma } from "@prisma/client";

const DB_UNAVAILABLE_COOLDOWN_MS = 30_000;
const DB_ERROR_LOG_COOLDOWN_MS = 30_000;

let dbUnavailableUntil = 0;
let lastDbErrorLogAt = 0;

function getErrorCode(error: unknown): string {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return error.code;
    }

    return "";
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message.toLowerCase();
    return String(error).toLowerCase();
}

export function isDatabaseConnectivityError(error: unknown): boolean {
    const code = getErrorCode(error);
    if (code === "P1001" || code === "P2024" || code === "P1008") {
        return true;
    }

    const message = getErrorMessage(error);
    return (
        message.includes("can't reach database server") ||
        message.includes("prismaclientinitializationerror") ||
        message.includes("timed out fetching a new connection from the connection pool") ||
        message.includes("connection pool timeout") ||
        message.includes("database server") && message.includes("timed out")
    );
}

export function isDatabaseUnavailableNow(): boolean {
    return Date.now() < dbUnavailableUntil;
}

export function markDatabaseUnavailable(error: unknown, context: string): boolean {
    if (!isDatabaseConnectivityError(error)) {
        return false;
    }

    const now = Date.now();
    dbUnavailableUntil = Math.max(dbUnavailableUntil, now + DB_UNAVAILABLE_COOLDOWN_MS);

    if (now - lastDbErrorLogAt >= DB_ERROR_LOG_COOLDOWN_MS) {
        const code = getErrorCode(error) || "unknown";
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
            `[db] connectivity issue in ${context}; cooling down DB calls for ${DB_UNAVAILABLE_COOLDOWN_MS}ms`,
            { code, message }
        );
        lastDbErrorLogAt = now;
    }

    return true;
}

