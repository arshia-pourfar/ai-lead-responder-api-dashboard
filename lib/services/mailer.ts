import nodemailer from "nodemailer";

interface SendEmailPayload {
    to: string;
    subject: string;
    html: string;
    text: string;
}

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getRequiredEnv(name: "EMAIL_HOST" | "EMAIL_PORT" | "EMAIL_USER" | "EMAIL_PASS"): string {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`${name} is not configured.`);
    }
    return value;
}

function getTransporter() {
    if (cachedTransporter) {
        return cachedTransporter;
    }

    const host = getRequiredEnv("EMAIL_HOST");
    const port = Number.parseInt(getRequiredEnv("EMAIL_PORT"), 10);
    if (!Number.isFinite(port) || port <= 0) {
        throw new Error("EMAIL_PORT must be a valid positive number.");
    }

    const user = getRequiredEnv("EMAIL_USER");
    const pass = getRequiredEnv("EMAIL_PASS");

    cachedTransporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
            user,
            pass,
        },
    });

    return cachedTransporter;
}

export async function sendEmail(payload: SendEmailPayload) {
    const transporter = getTransporter();
    const from = process.env.EMAIL_FROM?.trim() || getRequiredEnv("EMAIL_USER");

    await transporter.sendMail({
        from,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
    });
}
