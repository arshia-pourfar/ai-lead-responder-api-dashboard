import prisma from "@/lib/prisma";

export const DEFAULT_EMAIL_CATEGORIES = ["unread", "ready", "important", "sent"] as const;
export const LEGACY_AI_CATEGORIES = ["support", "sales", "complaint", "general"] as const;

const CUSTOM_PROMPT_TITLE = "custom_ai_prompt";
const MAX_PROMPT_LENGTH = 4_000;
const MAX_CUSTOM_CATEGORIES = 25;
const MAX_CATEGORY_LENGTH = 40;

export interface UserAiSettings {
    customPrompt: string;
    customCategories: string[];
}

function normalizeText(value: string): string {
    return value.trim();
}

function normalizeCategoryName(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
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
    const [promptRecord, categoryRows] = await Promise.all([
        prisma.prompt.findFirst({
            where: { userId, title: CUSTOM_PROMPT_TITLE },
            select: { content: true },
        }),
        prisma.category.findMany({
            where: { userId },
            select: { name: true },
        }),
    ]);

    return {
        customPrompt: sanitizeCustomPrompt(promptRecord?.content ?? ""),
        customCategories: sanitizeCustomCategories(categoryRows.map((row) => row.name)),
    };
}

export async function saveUserAiSettings(
    userId: string,
    customPromptInput: string,
    customCategoriesInput: string[]
): Promise<UserAiSettings> {
    const customPrompt = sanitizeCustomPrompt(customPromptInput);
    const customCategories = sanitizeCustomCategories(customCategoriesInput);

    await prisma.$transaction(async (tx) => {
        const existingPrompt = await tx.prompt.findFirst({
            where: { userId, title: CUSTOM_PROMPT_TITLE },
            select: { id: true },
        });

        if (!customPrompt) {
            await tx.prompt.deleteMany({
                where: { userId, title: CUSTOM_PROMPT_TITLE },
            });
        } else if (existingPrompt) {
            await tx.prompt.update({
                where: { id: existingPrompt.id },
                data: { content: customPrompt },
            });

            await tx.prompt.deleteMany({
                where: {
                    userId,
                    title: CUSTOM_PROMPT_TITLE,
                    id: { not: existingPrompt.id },
                },
            });
        } else {
            await tx.prompt.create({
                data: {
                    title: CUSTOM_PROMPT_TITLE,
                    content: customPrompt,
                    userId,
                },
            });
        }

        await tx.category.deleteMany({ where: { userId } });

        if (customCategories.length > 0) {
            await tx.category.createMany({
                data: customCategories.map((name) => ({ name, userId })),
            });
        }
    });

    return { customPrompt, customCategories };
}
