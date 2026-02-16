import fetch from "node-fetch";
import dotenv from "dotenv";
import { buildClassifierCategories, getUserAiSettings } from "@/lib/services/userSettings";
dotenv.config();

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const FALLBACK_CATEGORY = "general";

export type EmailCategory = string;

interface GeminiCategoryResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{ text?: string }>;
        };
    }>;
}

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

    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) return FALLBACK_CATEGORY;

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

    try {
        const response = await fetch(GEMINI_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-goog-api-key": apiKey,
            },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });

        if (!response.ok) return "general";

        const data: unknown = await response.json();
        const rawCategory = (data as GeminiCategoryResponse)?.candidates?.[0]?.content?.parts?.[0]?.text;
        return normalizeCategoryWithFallback(rawCategory, allowedCategories, FALLBACK_CATEGORY);
    } catch {
        return FALLBACK_CATEGORY;
    }
}
