import { buildClassifierCategories, getUserAiSettings } from "@/lib/services/userSettings";
import { generateAiText } from "@/lib/services/aiClient";
const FALLBACK_CATEGORY = "general";

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

    const rawCategory = await generateAiText(prompt, {
        userId,
        temperature: 0,
        maxTokens: 50,
    });

    return normalizeCategoryWithFallback(rawCategory, allowedCategories, FALLBACK_CATEGORY);
}
