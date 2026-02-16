import { NextRequest, NextResponse } from "next/server";
import { authGuard } from "@/lib/middleware/authMiddleware";
import {
    DEFAULT_EMAIL_CATEGORIES,
    getUserAiSettings,
    saveUserAiSettings,
} from "@/lib/services/userSettings";
import {
    getUserEmailSettings,
    saveUserEmailSettings,
    UserEmailSettings,
} from "@/lib/services/emailCredentials";

export const dynamic = "force-dynamic";

interface SettingsResponse {
    customPrompt: string;
    customCategories: string[];
    defaultCategories: string[];
    emailSettings: UserEmailSettings;
}

interface AuthUser {
    id: string;
}

function getAuthorizedUser(req: NextRequest): AuthUser | null {
    const user = authGuard(req);
    if (!user || typeof user !== "object" || !("id" in user)) {
        return null;
    }

    return {
        id: String(user.id),
    };
}

function getDefaultEmailSettings(): UserEmailSettings {
    return {
        registrationEmail: "",
        useRegistrationEmail: true,
        emailAddress: "",
        hasAppPassword: false,
    };
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === "boolean") return value;
    return fallback;
}

export async function GET(req: NextRequest) {
    const user = getAuthorizedUser(req);
    if (!user) {
        return NextResponse.json<SettingsResponse>(
            {
                customPrompt: "",
                customCategories: [],
                defaultCategories: [...DEFAULT_EMAIL_CATEGORIES],
                emailSettings: getDefaultEmailSettings(),
            },
            { status: 401 }
        );
    }

    try {
        const [aiSettings, emailSettings] = await Promise.all([
            getUserAiSettings(user.id),
            getUserEmailSettings(user.id),
        ]);

        return NextResponse.json<SettingsResponse>(
            {
                ...aiSettings,
                defaultCategories: [...DEFAULT_EMAIL_CATEGORIES],
                emailSettings,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("SETTINGS GET ERROR:", error);
        return NextResponse.json<SettingsResponse>(
            {
                customPrompt: "",
                customCategories: [],
                defaultCategories: [...DEFAULT_EMAIL_CATEGORIES],
                emailSettings: getDefaultEmailSettings(),
            },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    const user = getAuthorizedUser(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const customPrompt = typeof body.customPrompt === "string" ? body.customPrompt : "";
    const customCategories = Array.isArray(body.customCategories)
        ? body.customCategories.filter((item: unknown): item is string => typeof item === "string")
        : [];

    const emailSettingsInput =
        body.emailSettings && typeof body.emailSettings === "object"
            ? (body.emailSettings as Record<string, unknown>)
            : null;
    const shouldUpdateEmailSettings = Boolean(emailSettingsInput);

    try {
        const [aiSettings, emailSettings] = await Promise.all([
            saveUserAiSettings(user.id, customPrompt, customCategories),
            shouldUpdateEmailSettings
                ? saveUserEmailSettings({
                    userId: user.id,
                    useRegistrationEmail: parseBoolean(
                        emailSettingsInput?.useRegistrationEmail,
                        true
                    ),
                    emailAddress:
                        typeof emailSettingsInput?.emailAddress === "string"
                            ? emailSettingsInput.emailAddress
                            : "",
                    appPassword:
                        typeof emailSettingsInput?.appPassword === "string"
                            ? emailSettingsInput.appPassword
                            : "",
                })
                : getUserEmailSettings(user.id),
        ]);

        return NextResponse.json<SettingsResponse>(
            {
                ...aiSettings,
                defaultCategories: [...DEFAULT_EMAIL_CATEGORIES],
                emailSettings,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("SETTINGS POST ERROR:", error);
        const message =
            error instanceof Error && error.message
                ? error.message
                : "Failed to save settings";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
