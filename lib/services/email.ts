import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false,
    },
});

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

    try {
        await transporter.sendMail({
            from: `"Support Team" <${process.env.EMAIL_USER}>`,
            to: recipient,
            subject,
            text: replyText,
            html: `<p>${replyText}</p>`,
        });
        return { success: true };
    } catch (err) {
        console.error("Email send error:", err);
        const message = err instanceof Error ? err.message : "SMTP send failed";
        return { success: false, error: `SMTP send failed: ${message}` };
    }
}

export async function sendAutoReply(
    email: string,
    reply: string,
    category: string
): Promise<boolean> {
    const result = await sendAutoReplyDetailed(email, reply, category);
    return result.success;
}
