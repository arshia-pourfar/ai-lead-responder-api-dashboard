import fetch from "node-fetch";
import {
    AiProvider,
    resolveUserAiRuntimeSettings,
} from "@/lib/services/userSettings";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest";

interface GenerateAiTextOptions {
    userId?: string;
    temperature?: number;
    maxTokens?: number;
}

interface GeminiResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{ text?: string }>;
        };
    }>;
}

interface OpenAiResponse {
    choices?: Array<{
        message?: {
            content?: unknown;
        };
    }>;
}

interface AnthropicResponse {
    content?: Array<{
        type?: string;
        text?: string;
    }>;
}

function normalizeTemperature(value: number | undefined): number {
    if (!Number.isFinite(value)) return 0.2;
    return Math.min(Math.max(value as number, 0), 1);
}

function normalizeMaxTokens(value: number | undefined, fallback: number): number {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(32, Math.floor(value as number));
}

function extractOpenAiContent(content: unknown): string {
    if (typeof content === "string") return content.trim();
    if (!Array.isArray(content)) return "";

    return content
        .map((part) => {
            if (typeof part === "string") return part;
            if (!part || typeof part !== "object") return "";
            if ("text" in part && typeof part.text === "string") return part.text;
            return "";
        })
        .join("\n")
        .trim();
}

async function generateWithGemini(
    prompt: string,
    apiKey: string,
    temperature: number,
    maxTokens: number
): Promise<string | null> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-goog-api-key": apiKey,
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature,
                maxOutputTokens: maxTokens,
            },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error("Gemini API error:", errorText || response.statusText);
        return null;
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    return text || null;
}

async function generateWithOpenAi(
    prompt: string,
    apiKey: string,
    temperature: number,
    maxTokens: number
): Promise<string | null> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature,
            max_tokens: maxTokens,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error("OpenAI API error:", errorText || response.statusText);
        return null;
    }

    const data = (await response.json()) as OpenAiResponse;
    const rawContent = data.choices?.[0]?.message?.content;
    const text = extractOpenAiContent(rawContent);
    return text || null;
}

async function generateWithAnthropic(
    prompt: string,
    apiKey: string,
    temperature: number,
    maxTokens: number
): Promise<string | null> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model: ANTHROPIC_MODEL,
            max_tokens: maxTokens,
            temperature,
            messages: [{ role: "user", content: prompt }],
        }),
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error("Anthropic API error:", errorText || response.statusText);
        return null;
    }

    const data = (await response.json()) as AnthropicResponse;
    const textPart = data.content?.find(
        (part) => part?.type === "text" && typeof part.text === "string"
    );
    const text = textPart?.text?.trim() || "";
    return text || null;
}

async function generateByProvider(
    provider: AiProvider,
    prompt: string,
    apiKey: string,
    temperature: number,
    maxTokens: number
): Promise<string | null> {
    if (provider === "gemini") {
        return generateWithGemini(prompt, apiKey, temperature, maxTokens);
    }
    if (provider === "openai") {
        return generateWithOpenAi(prompt, apiKey, temperature, maxTokens);
    }
    return generateWithAnthropic(prompt, apiKey, temperature, maxTokens);
}

export async function generateAiText(
    prompt: string,
    options: GenerateAiTextOptions = {}
): Promise<string | null> {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) return null;

    const runtimeSettings = await resolveUserAiRuntimeSettings(options.userId);
    if (!runtimeSettings?.apiKey) {
        return null;
    }

    const temperature = normalizeTemperature(options.temperature);
    const maxTokens = normalizeMaxTokens(options.maxTokens, 400);

    try {
        return await generateByProvider(
            runtimeSettings.provider,
            normalizedPrompt,
            runtimeSettings.apiKey,
            temperature,
            maxTokens
        );
    } catch (error) {
        console.error(
            `AI generation failed for provider ${runtimeSettings.provider}:`,
            error
        );
        return null;
    }
}
