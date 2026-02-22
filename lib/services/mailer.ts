import nodemailer from "nodemailer";

interface SendEmailPayload {
    to: string;
    subject: string;
    html: string;
    text: string;
}

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getOptionalEnv(name: string) {
    const value = process.env[name]?.trim();
    return value || null;
}

function getRequiredEnvPair(primary: string, fallback: string) {
    const primaryValue = getOptionalEnv(primary);
    if (primaryValue) {
        return primaryValue;
    }

    const fallbackValue = getOptionalEnv(fallback);
    if (fallbackValue) {
        return fallbackValue;
    }

    throw new Error(`Missing email config: set ${primary} (or ${fallback}).`);
}

function getOptionalEnvPair(primary: string, fallback: string) {
    return getOptionalEnv(primary) || getOptionalEnv(fallback);
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

    const host = getOptionalEnvPair("EMAIL_HOST", "SMTP_HOST") || "smtp.gmail.com";
    const portString = getOptionalEnvPair("EMAIL_PORT", "SMTP_PORT") || "587";
    const port = Number.parseInt(portString, 10);
    if (!Number.isFinite(port) || port <= 0) {
        throw new Error(
            "EMAIL_PORT/SMTP_PORT must be a valid positive number when provided."
        );
    }

    const user = getRequiredEnvPair("EMAIL_USER", "SMTP_USER");
    const pass = getRequiredEnvPair("EMAIL_PASS", "SMTP_PASS");
    const secure =
        isTruthy(getOptionalEnv("EMAIL_SECURE") ?? getOptionalEnv("SMTP_SECURE")) ||
        port === 465;

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
        getOptionalEnv("EMAIL_FROM") ||
        getOptionalEnv("SMTP_FROM") ||
        getOptionalEnv("EMAIL_USER") ||
        getOptionalEnv("SMTP_USER") ||
        getRequiredEnvPair("EMAIL_USER", "SMTP_USER");

    await transporter.sendMail({
        from,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
    });
}
