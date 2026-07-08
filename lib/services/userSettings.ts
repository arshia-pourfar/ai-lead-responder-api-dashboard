import prisma from "@/lib/prisma";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { Prisma } from "@prisma/client";

export const DEFAULT_EMAIL_CATEGORIES = ["unread", "ready", "important", "sent"] as const;
export const LEGACY_AI_CATEGORIES = ["support", "sales", "complaint", "general"] as const;
export const AI_PROVIDERS = ["gemini", "openai", "anthropic"] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

const CUSTOM_PROMPT_TITLE = "custom_ai_prompt";
const CUSTOM_AI_PROVIDER_TITLE = "custom_ai_provider";
const CUSTOM_AI_API_KEY_ENCRYPTED_TITLE = "custom_ai_api_key_encrypted";
const AUTO_APPROVE_UNREAD_TITLE = "automation_auto_approve_unread";
const AUTO_SEND_READY_EMAILS_TITLE = "automation_auto_send_ready_emails";
const SETTINGS_PROMPT_TITLES = [
    CUSTOM_PROMPT_TITLE,
    CUSTOM_AI_PROVIDER_TITLE,
    CUSTOM_AI_API_KEY_ENCRYPTED_TITLE,
    AUTO_APPROVE_UNREAD_TITLE,
    AUTO_SEND_READY_EMAILS_TITLE,
] as const;

const MAX_PROMPT_LENGTH = 4_000;
const MAX_CUSTOM_CATEGORIES = 25;
const MAX_CATEGORY_LENGTH = 40;
const DEV_FALLBACK_AI_ENCRYPTION_KEY = "local-dev-ai-credentials-key";
const AUTOMATION_SETTINGS_DB_COOLDOWN_MS = 60_000;

let hasLoggedAiFallbackKeyWarning = false;
let automationSettingsDbUnavailableUntil = 0;

interface PromptRow {
    id: string;
    title: string;
    content: string;
}

interface StoredAiProviderConfig {
    provider: AiProvider | null;
    encryptedApiKey: string | null;
}

interface SaveAiProviderSettingsInput {
    useDefaultProvider?: boolean;
    provider?: string;
    apiKey?: string;
}

interface NormalizedAiProviderSettingsInput {
    useDefaultProvider: boolean;
    provider: AiProvider;
    apiKey: string;
}

type AiSettingsSource = "user" | "env";

export interface UserAiProviderSettings {
    useDefaultProvider: boolean;
    provider: AiProvider;
    hasApiKey: boolean;
}

export interface UserAiSettings {
    customPrompt: string;
    customCategories: string[];
    aiProviderSettings: UserAiProviderSettings;
}

export interface UserAutomationSettings {
    autoApproveUnread: boolean;
    autoSendReadyEmails: boolean;
}

export const DEFAULT_USER_AUTOMATION_SETTINGS: UserAutomationSettings = {
    autoApproveUnread: false,
    autoSendReadyEmails: false,
};

export interface SaveUserAiSettingsInput {
    customPrompt: string;
    customCategories: string[];
    aiProviderSettings?: SaveAiProviderSettingsInput;
}

export interface SaveUserAutomationSettingsInput {
    autoApproveUnread?: boolean;
    autoSendReadyEmails?: boolean;
}

export interface ResolvedAiRuntimeSettings {
    provider: AiProvider;
    apiKey: string;
    source: AiSettingsSource;
}

function normalizeText(value: string): string {
    return value.trim();
}

function normalizeCategoryName(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeApiKey(value: string): string {
    return value.trim();
}

function parseBooleanPromptValue(value: string | null | undefined): boolean {
    const normalized = (value || "").trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
}

function isDatabaseConnectivityError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const message = error.message.toLowerCase();
    return (
        message.includes("can't reach database server") ||
        message.includes("prismaclientinitializationerror") ||
        message.includes("p1001") ||
        message.includes("timed out")
    );
}

function toUniqueList(values: string[]): string[] {
    const seen = new Set<string>();
    const output: string[] = [];

    for (const value of values) {
        const normalized = normalizeCategoryName(value);
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        output.push(normalized);
    }

    return output;
}

function isAiProvider(value: string): value is AiProvider {
    return (AI_PROVIDERS as readonly string[]).includes(value);
}

export function normalizeAiProvider(value: string | null | undefined): AiProvider {
    const normalized = (value || "").trim().toLowerCase();
    return isAiProvider(normalized) ? normalized : "gemini";
}

function findPromptByTitle(rows: PromptRow[], title: string): PromptRow | null {
    return rows.find((row) => row.title === title) ?? null;
}

function getStoredAiProviderConfig(rows: PromptRow[]): StoredAiProviderConfig {
    const providerRow = findPromptByTitle(rows, CUSTOM_AI_PROVIDER_TITLE);
    const keyRow = findPromptByTitle(rows, CUSTOM_AI_API_KEY_ENCRYPTED_TITLE);

    return {
        provider: providerRow ? normalizeAiProvider(providerRow.content) : null,
        encryptedApiKey: keyRow?.content?.trim() || null,
    };
}

function getEnvApiKey(provider: AiProvider): string {
    if (provider === "gemini") return normalizeApiKey(process.env.GEMINI_API_KEY || "");
    if (provider === "openai") return normalizeApiKey(process.env.OPENAI_API_KEY || "");
    return normalizeApiKey(process.env.ANTHROPIC_API_KEY || "");
}

export function getDefaultAiProviderFromEnv(): AiProvider {
    for (const provider of AI_PROVIDERS) {
        if (getEnvApiKey(provider)) return provider;
    }
    return "gemini";
}

function getEnvRuntimeSettings(): ResolvedAiRuntimeSettings | null {
    for (const provider of AI_PROVIDERS) {
        const apiKey = getEnvApiKey(provider);
        if (!apiKey) continue;
        return {
            provider,
            apiKey,
            source: "env",
        };
    }
    return null;
}

function getEncryptionKey(): Buffer {
    const secretCandidates = [
        process.env.AI_CREDENTIALS_ENCRYPTION_KEY,
        process.env.EMAIL_CREDENTIALS_ENCRYPTION_KEY,
        process.env.JWT_SECRET,
        process.env.AUTH_SECRET,
        process.env.NEXTAUTH_SECRET,
    ];
    const secret = secretCandidates.find((value) => typeof value === "string" && value.trim() !== "") || "";

    if (!secret) {
        if (process.env.NODE_ENV !== "production") {
            if (!hasLoggedAiFallbackKeyWarning) {
                console.warn(
                    "Using development fallback for AI key encryption. Set AI_CREDENTIALS_ENCRYPTION_KEY for secure persistence."
                );
                hasLoggedAiFallbackKeyWarning = true;
            }
            return createHash("sha256").update(DEV_FALLBACK_AI_ENCRYPTION_KEY).digest();
        }

        throw new Error(
            "Set AI_CREDENTIALS_ENCRYPTION_KEY (or EMAIL_CREDENTIALS_ENCRYPTION_KEY/JWT_SECRET) in production"
        );
    }

    return createHash("sha256").update(secret).digest();
}

function encryptSecret(plainText: string): string {
    const key = getEncryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString("base64")}.${authTag.toString("base64")}.${encrypted.toString("base64")}`;
}

function decryptSecret(payload: string): string {
    const [ivB64, tagB64, dataB64] = payload.split(".");
    if (!ivB64 || !tagB64 || !dataB64) {
        throw new Error("Invalid encrypted AI key payload");
    }

    const key = getEncryptionKey();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(dataB64, "base64")),
        decipher.final(),
    ]);

    return decrypted.toString("utf8");
}

function normalizeAiProviderSettingsInput(
    input: SaveAiProviderSettingsInput | undefined
): NormalizedAiProviderSettingsInput | null {
    if (!input || typeof input !== "object") {
        return null;
    }

    return {
        useDefaultProvider: input.useDefaultProvider !== false,
        provider: normalizeAiProvider(input.provider),
        apiKey: normalizeApiKey(input.apiKey || ""),
    };
}

function buildUserAiProviderSettings(
    storedConfig: StoredAiProviderConfig
): UserAiProviderSettings {
    const hasCustomConfig = Boolean(storedConfig.provider && storedConfig.encryptedApiKey);

    return {
        useDefaultProvider: !hasCustomConfig,
        provider: storedConfig.provider ?? getDefaultAiProviderFromEnv(),
        hasApiKey: hasCustomConfig,
    };
}

async function writePromptValue(
    tx: Prisma.TransactionClient,
    userId: string,
    title: string,
    value: string
): Promise<void> {
    const existingPrompt = await tx.prompt.findFirst({
        where: { userId, title },
        select: { id: true },
    });

    if (!value) {
        await tx.prompt.deleteMany({ where: { userId, title } });
        return;
    }

    if (existingPrompt) {
        await tx.prompt.update({
            where: { id: existingPrompt.id },
            data: { content: value },
        });

        await tx.prompt.deleteMany({
            where: {
                userId,
                title,
                id: { not: existingPrompt.id },
            },
        });
        return;
    }

    await tx.prompt.create({
        data: {
            title,
            content: value,
            userId,
        },
    });
}

export function sanitizeCustomPrompt(input: string): string {
    return normalizeText(input).slice(0, MAX_PROMPT_LENGTH);
}

export function sanitizeCustomCategories(input: string[]): string[] {
    const protectedDefaults = new Set(DEFAULT_EMAIL_CATEGORIES.map((value) => value.toLowerCase()));
    const categories = toUniqueList(input)
        .filter((name) => !protectedDefaults.has(name))
        .map((name) => name.slice(0, MAX_CATEGORY_LENGTH));

    return categories.slice(0, MAX_CUSTOM_CATEGORIES);
}

export function buildClassifierCategories(customCategories: string[]): string[] {
    return toUniqueList([
        ...LEGACY_AI_CATEGORIES,
        ...DEFAULT_EMAIL_CATEGORIES,
        ...customCategories,
    ]);
}

export async function getUserAiSettings(userId: string): Promise<UserAiSettings> {
    const [promptRows, categoryRows] = await Promise.all([
        prisma.prompt.findMany({
            where: {
                userId,
                title: { in: [...SETTINGS_PROMPT_TITLES] },
            },
            select: {
                id: true,
                title: true,
                content: true,
            },
        }),
        prisma.category.findMany({
            where: { userId },
            select: { name: true },
        }),
    ]);

    const customPromptRow = findPromptByTitle(promptRows, CUSTOM_PROMPT_TITLE);
    const storedConfig = getStoredAiProviderConfig(promptRows);

    return {
        customPrompt: sanitizeCustomPrompt(customPromptRow?.content ?? ""),
        customCategories: sanitizeCustomCategories(categoryRows.map((row) => row.name)),
        aiProviderSettings: buildUserAiProviderSettings(storedConfig),
    };
}

export async function getUserAutomationSettings(
    userId: string
): Promise<UserAutomationSettings> {
    if (Date.now() < automationSettingsDbUnavailableUntil) {
        return { ...DEFAULT_USER_AUTOMATION_SETTINGS };
    }

    try {
        const promptRows = await prisma.prompt.findMany({
            where: {
                userId,
                title: { in: [AUTO_APPROVE_UNREAD_TITLE, AUTO_SEND_READY_EMAILS_TITLE] },
            },
            select: {
                id: true,
                title: true,
                content: true,
            },
        });

        const autoApproveRow = findPromptByTitle(promptRows, AUTO_APPROVE_UNREAD_TITLE);
        const autoSendRow = findPromptByTitle(promptRows, AUTO_SEND_READY_EMAILS_TITLE);

        return {
            autoApproveUnread: parseBooleanPromptValue(autoApproveRow?.content),
            autoSendReadyEmails: parseBooleanPromptValue(autoSendRow?.content),
        };
    } catch (error) {
        if (isDatabaseConnectivityError(error)) {
            automationSettingsDbUnavailableUntil =
                Date.now() + AUTOMATION_SETTINGS_DB_COOLDOWN_MS;
            console.warn(
                "DB unavailable while loading automation settings; using defaults temporarily."
            );
            return { ...DEFAULT_USER_AUTOMATION_SETTINGS };
        }

        throw error;
    }
}

async function resolveStoredUserAiRuntimeSettings(
    userId: string
): Promise<ResolvedAiRuntimeSettings | null> {
    const rows = await prisma.prompt.findMany({
        where: {
            userId,
            title: { in: [CUSTOM_AI_PROVIDER_TITLE, CUSTOM_AI_API_KEY_ENCRYPTED_TITLE] },
        },
        select: { id: true, title: true, content: true },
    });

    const storedConfig = getStoredAiProviderConfig(rows);
    if (!storedConfig.provider || !storedConfig.encryptedApiKey) {
        return null;
    }

    try {
        const decryptedApiKey = normalizeApiKey(decryptSecret(storedConfig.encryptedApiKey));
        if (!decryptedApiKey) return null;

        return {
            provider: storedConfig.provider,
            apiKey: decryptedApiKey,
            source: "user",
        };
    } catch (error) {
        console.error("Failed to decrypt stored user AI key:", error);
        return null;
    }
}

export async function resolveUserAiRuntimeSettings(
    userId?: string
): Promise<ResolvedAiRuntimeSettings | null> {
    if (userId) {
        const stored = await resolveStoredUserAiRuntimeSettings(userId);
        if (stored) return stored;
    }

    return getEnvRuntimeSettings();
}

export async function saveUserAiSettings(
    userId: string,
    input: SaveUserAiSettingsInput
): Promise<UserAiSettings> {
    const customPrompt = sanitizeCustomPrompt(input.customPrompt);
    const customCategories = sanitizeCustomCategories(input.customCategories);
    const aiProviderSettingsInput = normalizeAiProviderSettingsInput(input.aiProviderSettings);

    await prisma.$transaction(
        async (tx) => {
            const existingRows = await tx.prompt.findMany({
                where: {
                    userId,
                    title: { in: [CUSTOM_AI_PROVIDER_TITLE, CUSTOM_AI_API_KEY_ENCRYPTED_TITLE] },
                },
                select: { id: true, title: true, content: true },
            });
            const existingConfig = getStoredAiProviderConfig(existingRows);

            await writePromptValue(tx, userId, CUSTOM_PROMPT_TITLE, customPrompt);

            await tx.category.deleteMany({ where: { userId } });
            if (customCategories.length > 0) {
                await tx.category.createMany({
                    data: customCategories.map((name) => ({ name, userId })),
                });
            }

            if (!aiProviderSettingsInput) {
                return;
            }

            if (aiProviderSettingsInput.useDefaultProvider) {
                await tx.prompt.deleteMany({
                    where: {
                        userId,
                        title: { in: [CUSTOM_AI_PROVIDER_TITLE, CUSTOM_AI_API_KEY_ENCRYPTED_TITLE] },
                    },
                });
                return;
            }

            const changingProvider = !existingConfig.provider || existingConfig.provider !== aiProviderSettingsInput.provider;
            const existingEncryptedKey = existingConfig.encryptedApiKey || "";
            const nextEncryptedKey = aiProviderSettingsInput.apiKey
                ? encryptSecret(aiProviderSettingsInput.apiKey)
                : existingEncryptedKey;

            if (!nextEncryptedKey || (changingProvider && !aiProviderSettingsInput.apiKey)) {
                throw new Error("API key is required when selecting or changing AI provider");
            }

            await writePromptValue(tx, userId, CUSTOM_AI_PROVIDER_TITLE, aiProviderSettingsInput.provider);
            await writePromptValue(tx, userId, CUSTOM_AI_API_KEY_ENCRYPTED_TITLE, nextEncryptedKey);
        },
        { timeout: 10000 }
    );

    return getUserAiSettings(userId);
}

export async function saveUserAutomationSettings(
    userId: string,
    input: SaveUserAutomationSettingsInput
): Promise<UserAutomationSettings> {
    const autoApproveUnread = input.autoApproveUnread === true;
    const autoSendReadyEmails = input.autoSendReadyEmails === true;

    await prisma.$transaction(
        async (tx) => {
            await writePromptValue(
                tx,
                userId,
                AUTO_APPROVE_UNREAD_TITLE,
                autoApproveUnread ? "1" : ""
            );
            await writePromptValue(
                tx,
                userId,
                AUTO_SEND_READY_EMAILS_TITLE,
                autoSendReadyEmails ? "1" : ""
            );
        },
        { timeout: 10000 }
    );

    return getUserAutomationSettings(userId);
}
