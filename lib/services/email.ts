import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

export interface SendAutoReplyResult {
    success: boolean;
    error?: string;
}

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isAutoEmailEnabled(): boolean {
    const value = (process.env.AUTO_EMAIL || "").toLowerCase().trim();
    return value === "true" || value === "1" || value === "yes";
}

function buildSmtpConfigs(): SMTPTransport.Options[] {
    const user = process.env.EMAIL_USER || "";
    const pass = process.env.EMAIL_PASS || "";

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

    const envHost = process.env.SMTP_HOST?.trim();
    const envPort = Number.parseInt(process.env.SMTP_PORT || "", 10);
    const envSecure = (process.env.SMTP_SECURE || "").toLowerCase().trim();
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

    // Gmail SSL first (usually more stable than STARTTLS on blocked networks)
    configs.push({
        ...base,
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        requireTLS: false,
    });

    // STARTTLS fallback
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

export async function sendAutoReplyDetailed(
    email: string,
    reply: string,
    category: string
): Promise<SendAutoReplyResult> {
    const recipient = (email || "").trim();
    const replyText = (reply || "").trim();

    if (!recipient || !isValidEmail(recipient)) {
        return { success: false, error: "Recipient email is missing or invalid" };
    }

    if (!replyText) {
        return { success: false, error: "Reply text is empty" };
    }

    if (!isAutoEmailEnabled()) {
        return { success: false, error: "AUTO_EMAIL is disabled" };
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return { success: false, error: "EMAIL_USER or EMAIL_PASS is missing" };
    }

    let subject = "Thanks for contacting us";
    if (category === "support") subject = "Support request received";
    else if (category === "sales") subject = "Pricing & Sales inquiry";
    else if (category === "complaint") subject = "Complaint received";

    const smtpConfigs = buildSmtpConfigs();
    const errors: string[] = [];

    for (const config of smtpConfigs) {
        const transporter = nodemailer.createTransport(config);
        try {
            await transporter.sendMail({
                from: `"Support Team" <${process.env.EMAIL_USER}>`,
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
            errors.push(`${endpoint} -> ${message}`);
            console.error("Email send error:", endpoint, err);
        }
    }

    return {
        success: false,
        error: `SMTP send failed: ${errors.join(" | ")}`,
    };
}

export async function sendAutoReply(
    email: string,
    reply: string,
    category: string
): Promise<boolean> {
    const result = await sendAutoReplyDetailed(email, reply, category);
    return result.success;
}
