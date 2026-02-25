import { buildClassifierCategories, getUserAiSettings } from "@/lib/services/userSettings";
import { generateAiText } from "@/lib/services/aiClient";
import { isAiGenerationError } from "@/lib/services/aiErrors";
const FALLBACK_CATEGORY = "general";
const QUOTA_WARNING_COOLDOWN_MS = 60_000;
const quotaWarningLastLogByScope = new Map<string, number>();

export type EmailCategory = string;

export function normalizeCategory(value: string | null | undefined): EmailCategory {
    const category = (value || "").trim().toLowerCase();
    return category || FALLBACK_CATEGORY;
}

function normalizeCategoryWithFallback(
    value: string | null | undefined,
    allowedCategories: string[],
    fallbackCategory: string
): EmailCategory {
    const category = (value || "").trim().toLowerCase();
    if (allowedCategories.includes(category)) {
        return category as EmailCategory;
    }
    return fallbackCategory;
}

function shouldLogQuotaWarning(userId?: string): boolean {
    const scope = (userId || "").trim() || "global";
    const now = Date.now();
    const lastLoggedAt = quotaWarningLastLogByScope.get(scope) ?? 0;
    if (now - lastLoggedAt < QUOTA_WARNING_COOLDOWN_MS) {
        return false;
    }
    quotaWarningLastLogByScope.set(scope, now);
    return true;
}

export async function detectCategory(message: string, userId?: string): Promise<EmailCategory> {
    const normalizedMessage = (message || "").trim();
    if (!normalizedMessage) return FALLBACK_CATEGORY;

    let customPrompt = "";
    let customCategories: string[] = [];

    if (userId) {
        try {
            const settings = await getUserAiSettings(userId);
            customPrompt = settings.customPrompt;
            customCategories = settings.customCategories;
        } catch (error) {
            console.error("Failed to load user AI settings for classification:", error);
        }
    }

    const allowedCategories = buildClassifierCategories(customCategories);
    const categoryList = allowedCategories.map((item) => `- ${item}`).join("\n");
    const customPromptSection = customPrompt
        ? `\nAdditional user instruction (append to system behavior):\n${customPrompt}\n`
        : "";

    const prompt = `
    Classify the following customer message into ONE of these categories:
    ${categoryList}

    Message:
    "${normalizedMessage}"

    ${customPromptSection}

    Only return the category name exactly as listed above.
  `;

    let rawCategory: string | null = null;
    try {
        rawCategory = await generateAiText(prompt, {
            userId,
            temperature: 0,
            maxTokens: 50,
        });
    } catch (error) {
        if (isAiGenerationError(error) && error.code === "QUOTA_EXCEEDED") {
            if (shouldLogQuotaWarning(userId)) {
                console.warn(
                    "Category detection fell back to default category: Daily AI request limit has been reached."
                );
            }
        } else {
            const reason = error instanceof Error ? error.message : String(error);
            console.warn(`Category detection fell back to default category: ${reason}`);
        }
        rawCategory = null;
    }

    return normalizeCategoryWithFallback(rawCategory, allowedCategories, FALLBACK_CATEGORY);
}
