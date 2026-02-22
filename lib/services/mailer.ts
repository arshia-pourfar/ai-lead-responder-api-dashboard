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

function getOptionalEnv(name: string) {
    return normalizeEnvValue(process.env[name] || process.env[name.toLowerCase()]);
}

function getFirstAvailableEnv(names: readonly string[]) {
    for (const name of names) {
        const value = getOptionalEnv(name);
        if (value) {
            return value;
        }
    }
    return null;
}

function getRequiredEnv(names: readonly string[]) {
    const value = getFirstAvailableEnv(names);
    if (value) {
        return value;
    }

    if (EMAIL_CONFIG_DIAGNOSTICS) {
        const diagnostics = names.reduce<Record<string, boolean>>((acc, key) => {
            acc[key] = Boolean(getOptionalEnv(key));
            return acc;
        }, {});
        console.error("[mailer] Missing email config", {
            checkedKeys: diagnostics,
            nodeEnv: process.env.NODE_ENV || null,
            vercelEnv: process.env.VERCEL_ENV || null,
        });
    }

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
