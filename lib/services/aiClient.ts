import fetch from "node-fetch";
import {
    AiProvider,
    resolveUserAiRuntimeSettings,
} from "@/lib/services/userSettings";
import {
    AiGenerationError,
    detectQuotaExceeded,
    isAiGenerationError,
} from "@/lib/services/aiErrors";
import {
    activateAiQuotaCooldown,
    getAiQuotaCooldownState,
} from "@/lib/services/aiQuotaCooldown";

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
): Promise<string> {
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
        throw new AiGenerationError(
            detectQuotaExceeded(response.status, errorText)
                ? "QUOTA_EXCEEDED"
                : "PROVIDER_ERROR",
            "Gemini API request failed.",
            {
                provider: "gemini",
                status: response.status,
                details: errorText || response.statusText,
            }
        );
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    if (!text) {
        throw new AiGenerationError("NO_RESPONSE", "Gemini returned an empty response.", {
            provider: "gemini",
            status: response.status,
        });
    }

    return text;
}

async function generateWithOpenAi(
    prompt: string,
    apiKey: string,
    temperature: number,
    maxTokens: number
): Promise<string> {
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
        throw new AiGenerationError(
            detectQuotaExceeded(response.status, errorText)
                ? "QUOTA_EXCEEDED"
                : "PROVIDER_ERROR",
            "OpenAI API request failed.",
            {
                provider: "openai",
                status: response.status,
                details: errorText || response.statusText,
            }
        );
    }

    const data = (await response.json()) as OpenAiResponse;
    const rawContent = data.choices?.[0]?.message?.content;
    const text = extractOpenAiContent(rawContent);
    if (!text) {
        throw new AiGenerationError("NO_RESPONSE", "OpenAI returned an empty response.", {
            provider: "openai",
            status: response.status,
        });
    }

    return text;
}

async function generateWithAnthropic(
    prompt: string,
    apiKey: string,
    temperature: number,
    maxTokens: number
): Promise<string> {
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
        throw new AiGenerationError(
            detectQuotaExceeded(response.status, errorText)
                ? "QUOTA_EXCEEDED"
                : "PROVIDER_ERROR",
            "Anthropic API request failed.",
            {
                provider: "anthropic",
                status: response.status,
                details: errorText || response.statusText,
            }
        );
    }

    const data = (await response.json()) as AnthropicResponse;
    const textPart = data.content?.find(
        (part) => part?.type === "text" && typeof part.text === "string"
    );
    const text = textPart?.text?.trim() || "";
    if (!text) {
        throw new AiGenerationError("NO_RESPONSE", "Anthropic returned an empty response.", {
            provider: "anthropic",
            status: response.status,
        });
    }

    return text;
}

async function generateByProvider(
    provider: AiProvider,
    prompt: string,
    apiKey: string,
    temperature: number,
    maxTokens: number
): Promise<string> {
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
): Promise<string> {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) {
        throw new AiGenerationError("NO_RESPONSE", "Prompt is empty.");
    }

    const runtimeSettings = await resolveUserAiRuntimeSettings(options.userId);
    if (!runtimeSettings?.apiKey) {
        throw new AiGenerationError(
            "MISSING_API_KEY",
            "No AI API key is configured for this account."
        );
    }

    const temperature = normalizeTemperature(options.temperature);
    const maxTokens = normalizeMaxTokens(options.maxTokens, 400);
    const quotaScopeUserId =
        runtimeSettings.source === "user" ? options.userId : undefined;
    const activeQuotaCooldown = getAiQuotaCooldownState(
        runtimeSettings.provider,
        quotaScopeUserId
    );
    if (activeQuotaCooldown) {
        throw new AiGenerationError("QUOTA_EXCEEDED", "AI quota cooldown is active.", {
            provider: runtimeSettings.provider,
            status: 429,
            details: activeQuotaCooldown.reason,
        });
    }

    try {
        return await generateByProvider(
            runtimeSettings.provider,
            normalizedPrompt,
            runtimeSettings.apiKey,
            temperature,
            maxTokens
        );
    } catch (error) {
        if (isAiGenerationError(error)) {
            if (
                error.code === "QUOTA_EXCEEDED" ||
                detectQuotaExceeded(error.status || 0, error.details)
            ) {
                activateAiQuotaCooldown({
                    provider: runtimeSettings.provider,
                    userId: quotaScopeUserId,
                    status: error.status,
                    details: error.details || error.message,
                });

                if (error.code !== "QUOTA_EXCEEDED") {
                    throw new AiGenerationError("QUOTA_EXCEEDED", error.message, {
                        provider: runtimeSettings.provider,
                        status: error.status,
                        details: error.details,
                    });
                }
            }
            throw error;
        }

        console.error(
            `AI generation failed for provider ${runtimeSettings.provider}:`,
            error
        );
        throw new AiGenerationError("PROVIDER_ERROR", "AI provider request failed.", {
            provider: runtimeSettings.provider,
        });
    }
}
