import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { resolveEmailCredentialCandidates } from "@/lib/services/emailCredentials";

export interface SendAutoReplyResult {
    success: boolean;
    error?: string;
}

interface SendAutoReplyOptions {
    allowWhenAutoEmailDisabled?: boolean;
}

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isAutoEmailEnabled(): boolean {
    const value = (process.env.AUTO_EMAIL || "").toLowerCase().trim();
    return value === "true" || value === "1" || value === "yes";
}

function buildSmtpConfigs(user: string, pass: string): SMTPTransport.Options[] {
    const base: SMTPTransport.Options = {
        auth: { user, pass },
        tls: {
            rejectUnauthorized: false,
            servername: "smtp.gmail.com",
        },
        connectionTimeout: 12_000,
        greetingTimeout: 12_000,
        socketTimeout: 20_000,
    };

    const envHost = (
        process.env.SMTP_HOST ||
        process.env.EMAIL_HOST ||
        process.env.MAIL_HOST ||
        process.env.smtp_host ||
        process.env.email_host ||
        process.env.mail_host ||
        ""
    ).trim();
    const envPort = Number.parseInt(
        process.env.SMTP_PORT ||
            process.env.EMAIL_PORT ||
            process.env.MAIL_PORT ||
            process.env.smtp_port ||
            process.env.email_port ||
            process.env.mail_port ||
            "",
        10
    );
    const envSecure = (
        process.env.SMTP_SECURE ||
        process.env.EMAIL_SECURE ||
        process.env.MAIL_SECURE ||
        process.env.smtp_secure ||
        process.env.email_secure ||
        process.env.mail_secure ||
        ""
    ).toLowerCase().trim();
    const hasEnvSmtp = Boolean(envHost && Number.isFinite(envPort) && envPort > 0);

    const configs: SMTPTransport.Options[] = [];

    if (hasEnvSmtp) {
        configs.push({
            ...base,
            host: envHost,
            port: envPort,
            secure: envSecure === "true" || envSecure === "1" || envSecure === "yes" || envPort === 465,
        });
    }

    configs.push({
        ...base,
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        requireTLS: false,
    });

    configs.push({
        ...base,
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        requireTLS: true,
    });

    return configs;
}

function extractErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    return "SMTP send failed";
}

function isSmtpAuthenticationFailure(err: unknown): boolean {
    const message = extractErrorMessage(err).toLowerCase();
    return (
        message.includes("invalid login") ||
        message.includes("authentication") ||
        message.includes("auth") ||
        message.includes("535") ||
        message.includes("username and password not accepted")
    );
}

export async function sendAutoReplyDetailed(
    email: string,
    reply: string,
    category: string,
    userId?: string,
    options?: SendAutoReplyOptions
): Promise<SendAutoReplyResult> {
    const recipient = (email || "").trim();
    const replyText = (reply || "").trim();

    if (!recipient || !isValidEmail(recipient)) {
        return { success: false, error: "Recipient email is missing or invalid" };
    }

    if (!replyText) {
        return { success: false, error: "Reply text is empty" };
    }

    const allowWhenAutoEmailDisabled = options?.allowWhenAutoEmailDisabled === true;
    if (!allowWhenAutoEmailDisabled && !isAutoEmailEnabled()) {
        return { success: false, error: "AUTO_EMAIL is disabled" };
    }

    const credentialCandidates = await resolveEmailCredentialCandidates(userId);
    if (credentialCandidates.length === 0) {
        return { success: false, error: "Email credentials are missing" };
    }

    let subject = "Thanks for contacting us";
    if (category === "support") subject = "Support request received";
    else if (category === "sales") subject = "Pricing & Sales inquiry";
    else if (category === "complaint") subject = "Complaint received";

    const errors: string[] = [];

    for (let index = 0; index < credentialCandidates.length; index += 1) {
        const credentials = credentialCandidates[index];
        const smtpConfigs = buildSmtpConfigs(
            credentials.emailAddress,
            credentials.appPassword
        );
        const candidateErrors: string[] = [];
        let hasAuthFailure = false;

        for (const config of smtpConfigs) {
            const transporter = nodemailer.createTransport(config);
            try {
                await transporter.sendMail({
                    from: `"Support Team" <${credentials.emailAddress}>`,
                    to: recipient,
                    subject,
                    text: replyText,
                    html: `<p>${replyText}</p>`,
                });
                transporter.close();
                return { success: true };
            } catch (err) {
                transporter.close();
                const message = extractErrorMessage(err);
                const endpoint = `${config.host}:${config.port}`;
                candidateErrors.push(`${endpoint} -> ${message}`);
                hasAuthFailure = hasAuthFailure || isSmtpAuthenticationFailure(err);
                console.error("Email send error:", endpoint, err);
            }
        }

        const hasNextCredential = index < credentialCandidates.length - 1;
        const canFallback = credentials.source === "user" && hasNextCredential && hasAuthFailure;
        if (canFallback) {
            console.warn(
                `SMTP authentication failed for user credentials (${credentials.emailAddress}); trying fallback credentials.`
            );
            continue;
        }

        errors.push(
            `[${credentials.source}:${credentials.emailAddress}] ${candidateErrors.join(" | ")}`
        );
    }

    return {
        success: false,
        error: `SMTP send failed: ${errors.join(" | ")}`,
    };
}

export async function sendAutoReply(
    email: string,
    reply: string,
    category: string,
    userId?: string
): Promise<boolean> {
    const result = await sendAutoReplyDetailed(email, reply, category, userId);
    return result.success;
}
