export type AiGenerationErrorCode =
    | "QUOTA_EXCEEDED"
    | "NO_RESPONSE"
    | "MISSING_API_KEY"
    | "PROVIDER_ERROR";

interface AiGenerationErrorOptions {
    provider?: string;
    status?: number;
    details?: string;
}

export class AiGenerationError extends Error {
    readonly code: AiGenerationErrorCode;
    readonly provider?: string;
    readonly status?: number;
    readonly details?: string;

    constructor(
        code: AiGenerationErrorCode,
        message: string,
        options: AiGenerationErrorOptions = {}
    ) {
        super(message);
        this.name = "AiGenerationError";
        this.code = code;
        this.provider = options.provider;
        this.status = options.status;
        this.details = options.details;
    }
}

const QUOTA_KEYWORDS = [
    "quota",
    "insufficient_quota",
    "resource_exhausted",
    "resource exhausted",
    "daily limit",
    "daily quota",
    "quota exceeded",
    "limit exceeded",
    "rate_limit_exceeded",
    "rate limit exceeded",
    "ratelimit",
    "userratelimitexceeded",
    "user rate limit exceeded",
    "exceeded your current quota",
    "too many requests",
    "out of quota",
    "rate limit",
];

export function detectQuotaExceeded(
    status: number,
    details: string | null | undefined
): boolean {
    if (status === 429) return true;

    const normalizedDetails = (details || "")
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!normalizedDetails) return false;
    return QUOTA_KEYWORDS.some((keyword) => normalizedDetails.includes(keyword));
}

export function isAiGenerationError(error: unknown): error is AiGenerationError {
    return error instanceof AiGenerationError;
}

export function getAiHttpStatus(error: unknown): number {
    if (!isAiGenerationError(error)) return 500;
    if (error.code === "QUOTA_EXCEEDED") return 429;
    if (
        error.code === "PROVIDER_ERROR" &&
        detectQuotaExceeded(error.status || 0, error.details)
    ) {
        return 429;
    }
    if (error.code === "MISSING_API_KEY") return 400;
    if (error.code === "NO_RESPONSE") return 502;
    return error.status && error.status >= 400 ? error.status : 502;
}

export function getAiUserMessage(error: unknown): string {
    if (!isAiGenerationError(error)) {
        return "AI request failed. Please try again.";
    }

    if (error.code === "QUOTA_EXCEEDED") {
        return "Daily AI request limit has been reached.";
    }
    if (
        error.code === "PROVIDER_ERROR" &&
        detectQuotaExceeded(error.status || 0, error.details)
    ) {
        return "Daily AI request limit has been reached.";
    }
    if (error.code === "NO_RESPONSE") {
        return "No response received from AI. Email was not marked as read.";
    }
    if (error.code === "MISSING_API_KEY") {
        return "AI API key is missing. Configure AI settings first.";
    }

    return "AI provider error. Please try again.";
}
