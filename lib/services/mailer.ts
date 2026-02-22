import nodemailer from "nodemailer";

interface SendEmailPayload {
    to: string;
    subject: string;
    html: string;
    text: string;
}

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

const EMAIL_CONFIG_DIAGNOSTICS =
    (process.env.EMAIL_CONFIG_DIAGNOSTICS || "").toLowerCase() === "true";
const EMAIL_USER_KEYS = [
    "EMAIL_USER",
    "SMTP_USER",
    "SMTP_USERNAME",
    "MAIL_USER",
    "MAIL_USERNAME",
] as const;
const EMAIL_PASS_KEYS = [
    "EMAIL_PASS",
    "SMTP_PASS",
    "SMTP_PASSWORD",
    "MAIL_PASS",
    "MAIL_PASSWORD",
] as const;
const EMAIL_HOST_KEYS = ["EMAIL_HOST", "SMTP_HOST", "MAIL_HOST"] as const;
const EMAIL_PORT_KEYS = ["EMAIL_PORT", "SMTP_PORT", "MAIL_PORT"] as const;
const EMAIL_SECURE_KEYS = ["EMAIL_SECURE", "SMTP_SECURE", "MAIL_SECURE"] as const;
const EMAIL_FROM_KEYS = ["EMAIL_FROM", "SMTP_FROM", "MAIL_FROM"] as const;
type EmailEnvKey =
    | (typeof EMAIL_USER_KEYS)[number]
    | (typeof EMAIL_PASS_KEYS)[number]
    | (typeof EMAIL_HOST_KEYS)[number]
    | (typeof EMAIL_PORT_KEYS)[number]
    | (typeof EMAIL_SECURE_KEYS)[number]
    | (typeof EMAIL_FROM_KEYS)[number];

// IMPORTANT: Next.js production bundles are more reliable with statically referenced
// env vars than dynamic process.env[key] lookups.
const EMAIL_ENV: Record<EmailEnvKey, string | undefined> = {
    EMAIL_USER: process.env.EMAIL_USER,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_USERNAME: process.env.SMTP_USERNAME,
    MAIL_USER: process.env.MAIL_USER,
    MAIL_USERNAME: process.env.MAIL_USERNAME,
    EMAIL_PASS: process.env.EMAIL_PASS,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    MAIL_PASS: process.env.MAIL_PASS,
    MAIL_PASSWORD: process.env.MAIL_PASSWORD,
    EMAIL_HOST: process.env.EMAIL_HOST,
    SMTP_HOST: process.env.SMTP_HOST,
    MAIL_HOST: process.env.MAIL_HOST,
    EMAIL_PORT: process.env.EMAIL_PORT,
    SMTP_PORT: process.env.SMTP_PORT,
    MAIL_PORT: process.env.MAIL_PORT,
    EMAIL_SECURE: process.env.EMAIL_SECURE,
    SMTP_SECURE: process.env.SMTP_SECURE,
    MAIL_SECURE: process.env.MAIL_SECURE,
    EMAIL_FROM: process.env.EMAIL_FROM,
    SMTP_FROM: process.env.SMTP_FROM,
    MAIL_FROM: process.env.MAIL_FROM,
};

function normalizeEnvValue(value: string | undefined) {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Some hosting dashboards store copied values with surrounding quotes.
    if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
        const unquoted = trimmed.slice(1, -1).trim();
        return unquoted || null;
    }

    return trimmed;
}

function getOptionalEnv(name: EmailEnvKey) {
    return normalizeEnvValue(EMAIL_ENV[name]);
}

function getFirstAvailableEnv(names: readonly EmailEnvKey[]) {
    for (const name of names) {
        const value = getOptionalEnv(name);
        if (value) {
            return value;
        }
    }
    return null;
}

function getRequiredEnv(names: readonly EmailEnvKey[]) {
    const value = getFirstAvailableEnv(names);
    if (value) {
        return value;
    }

    const diagnostics = names.reduce<Record<string, boolean>>((acc, key) => {
        acc[key] = Boolean(getOptionalEnv(key));
        return acc;
    }, {});
    console.error("[mailer] Missing email config", {
        checkedKeys: diagnostics,
        nodeEnv: process.env.NODE_ENV || null,
        vercelEnv: process.env.VERCEL_ENV || null,
        diagnosticsEnabled: EMAIL_CONFIG_DIAGNOSTICS,
    });

    throw new Error(`Missing email config: set one of ${names.join(", ")}.`);
}

function isTruthy(value: string | null) {
    if (!value) return false;
    const normalized = value.toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
}

function getTransporter() {
    if (cachedTransporter) {
        return cachedTransporter;
    }

    const host = getFirstAvailableEnv(EMAIL_HOST_KEYS) || "smtp.gmail.com";
    const portString = getFirstAvailableEnv(EMAIL_PORT_KEYS) || "587";
    const port = Number.parseInt(portString, 10);
    if (!Number.isFinite(port) || port <= 0) {
        throw new Error(
            "EMAIL_PORT/SMTP_PORT must be a valid positive number when provided."
        );
    }

    const user = getRequiredEnv(EMAIL_USER_KEYS);
    const pass = getRequiredEnv(EMAIL_PASS_KEYS).replace(/\s+/g, "");
    const secure = isTruthy(getFirstAvailableEnv(EMAIL_SECURE_KEYS)) || port === 465;

    cachedTransporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
            user,
            pass,
        },
    });

    return cachedTransporter;
}

export async function sendEmail(payload: SendEmailPayload) {
    const transporter = getTransporter();
    const from =
        getFirstAvailableEnv(EMAIL_FROM_KEYS) ||
        getFirstAvailableEnv(EMAIL_USER_KEYS) ||
        getRequiredEnv(EMAIL_USER_KEYS);

    await transporter.sendMail({
        from,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
    });
}
