import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const ALLOWED_CATEGORIES = ["support", "sales", "complaint", "general"] as const;
export type EmailCategory = (typeof ALLOWED_CATEGORIES)[number];

interface GeminiCategoryResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{ text?: string }>;
        };
    }>;
}

export function normalizeCategory(value: string | null | undefined): EmailCategory {
    const category = (value || "").trim().toLowerCase();
    if ((ALLOWED_CATEGORIES as readonly string[]).includes(category)) {
        return category as EmailCategory;
    }
    return "general";
}

export async function detectCategory(message: string): Promise<EmailCategory> {
    const normalizedMessage = (message || "").trim();
    if (!normalizedMessage) return "general";

    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) return "general";

    const prompt = `
    Classify the following customer message into ONE of these categories:
    - support
    - sales
    - complaint
    - general

    Message:
    "${normalizedMessage}"

    Only return the category name.
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
        return normalizeCategory(rawCategory);
    } catch {
        return "general";
    }
}
