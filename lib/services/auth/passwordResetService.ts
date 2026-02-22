import jwt from "jsonwebtoken";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { normalizeEmail } from "@/lib/services/auth/emailVerificationService";
import { sendEmail } from "@/lib/services/mailer";

const PASSWORD_RESET_EXPIRY = "30m";
const PASSWORD_RESET_SECRET =
    process.env.PASSWORD_RESET_SECRET || process.env.JWT_SECRET || "secret123";

interface PasswordResetTokenPayload {
    purpose: "password_reset";
    userId: string;
    email: string;
    iat?: number;
    exp?: number;
}

function normalizeOrigin(value: string | undefined): string {
    const trimmed = (value || "").trim();
    if (!trimmed) return "";

    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    try {
        return new URL(withProtocol).origin.replace(/\/+$/, "");
    } catch {
        return "";
    }
}

function resolveAppOrigin(requestOrigin?: string): string {
    const candidates = [
        process.env.APP_URL,
        process.env.NEXT_PUBLIC_APP_URL,
        process.env.VERCEL_PROJECT_PRODUCTION_URL,
        process.env.VERCEL_URL,
        requestOrigin,
    ];

    for (const candidate of candidates) {
        const normalized = normalizeOrigin(candidate);
        if (normalized) return normalized;
    }

    return "http://localhost:3000";
}

function buildResetPasswordEmail(resetUrl: string) {
    const subject = "Reset your password";
    const text = `We received a request to reset your password. Open this link to continue: ${resetUrl}\n\nThis link expires in 30 minutes.\nIf you did not request a password reset, you can ignore this email.`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 520px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 12px; font-size: 22px; color: #111827;">Reset your password</h2>
        <p style="margin: 0 0 16px;">We received a request to reset your password.</p>
        <p style="margin: 0 0 16px;">
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 16px; border-radius: 8px; background: #111827; color: #ffffff; text-decoration: none;">
            Reset Password
          </a>
        </p>
        <p style="margin: 0 0 8px;">This link expires in 30 minutes.</p>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">If you did not request this, you can ignore this email.</p>
      </div>
    `;

    return { subject, text, html };
}

function signResetToken(userId: string, email: string): string {
    const payload: PasswordResetTokenPayload = {
        purpose: "password_reset",
        userId,
        email,
    };

    return jwt.sign(payload, PASSWORD_RESET_SECRET, {
        expiresIn: PASSWORD_RESET_EXPIRY,
    });
}

function verifyResetToken(token: string): PasswordResetTokenPayload {
    const payload = jwt.verify(token, PASSWORD_RESET_SECRET) as PasswordResetTokenPayload;

    if (!payload || payload.purpose !== "password_reset" || !payload.userId || !payload.email) {
        throw new Error("Invalid reset token.");
    }

    return payload;
}

export async function requestPasswordReset(
    email: string,
    requestOrigin?: string
): Promise<void> {
    const normalizedEmail = normalizeEmail(email);
    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, email: true },
    });

    if (!user) {
        return;
    }

    const token = signResetToken(user.id, user.email);
    const appOrigin = resolveAppOrigin(requestOrigin);
    const resetUrl = `${appOrigin}/reset-password?token=${encodeURIComponent(token)}`;
    const template = buildResetPasswordEmail(resetUrl);

    await sendEmail({
        to: user.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
    });
}

export async function resetPasswordWithToken(
    token: string,
    newPassword: string
): Promise<void> {
    const payload = verifyResetToken(token);
    const normalizedEmail = normalizeEmail(payload.email);
    const hashedPassword = await hash(newPassword, 10);

    const updated = await prisma.user.updateMany({
        where: {
            id: payload.userId,
            email: normalizedEmail,
        },
        data: {
            password: hashedPassword,
        },
    });

    if (updated.count === 0) {
        throw new Error("Invalid reset token.");
    }
}
