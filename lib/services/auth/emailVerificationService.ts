import crypto from "crypto";
import { compare, hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/services/mailer";

const VERIFICATION_CODE_DIGITS = 6;
const VERIFICATION_CODE_EXPIRY_MINUTES = 10;

function generateVerificationCode() {
    return crypto
        .randomInt(0, 10 ** VERIFICATION_CODE_DIGITS)
        .toString()
        .padStart(VERIFICATION_CODE_DIGITS, "0");
}

function getVerificationExpiryDate() {
    return new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);
}

function buildVerificationEmailTemplate(code: string) {
    const subject = "Verify your email address";
    const text = `Your verification code is ${code}. It expires in ${VERIFICATION_CODE_EXPIRY_MINUTES} minutes.`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 12px; font-size: 22px; color: #111827;">Verify your email</h2>
        <p style="margin: 0 0 18px;">Use the code below to complete your signup:</p>
        <div style="font-size: 30px; font-weight: 700; letter-spacing: 8px; text-align: center; padding: 16px; background: #f3f4f6; border-radius: 10px; margin: 0 0 18px;">
          ${code}
        </div>
        <p style="margin: 0 0 8px;">This code expires in ${VERIFICATION_CODE_EXPIRY_MINUTES} minutes.</p>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">If you did not request this, you can ignore this email.</p>
      </div>
    `;

    return { subject, text, html };
}

export function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

export async function createAndSendVerificationCode(userId: string, email: string) {
    const code = generateVerificationCode();
    const verificationCode = await hash(code, 10);
    const verificationCodeExpiresAt = getVerificationExpiryDate();

    await prisma.user.update({
        where: { id: userId },
        data: {
            isVerified: false,
            verificationCode,
            verificationCodeExpiresAt,
        },
    });

    const template = buildVerificationEmailTemplate(code);
    await sendEmail({
        to: email,
        subject: template.subject,
        text: template.text,
        html: template.html,
    });
}

export async function verifyEmailCode(email: string, code: string) {
    const normalizedEmail = normalizeEmail(email);
    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
            id: true,
            verificationCode: true,
            verificationCodeExpiresAt: true,
        },
    });

    if (!user || !user.verificationCode || !user.verificationCodeExpiresAt) {
        return false;
    }

    if (user.verificationCodeExpiresAt.getTime() < Date.now()) {
        await prisma.user.update({
            where: { id: user.id },
            data: {
                verificationCode: null,
                verificationCodeExpiresAt: null,
            },
        });
        return false;
    }

    const isCodeValid = await compare(code, user.verificationCode);
    if (!isCodeValid) {
        return false;
    }

    await prisma.user.update({
        where: { id: user.id },
        data: {
            isVerified: true,
            verificationCode: null,
            verificationCodeExpiresAt: null,
        },
    });

    return true;
}

export async function resendVerificationCode(email: string) {
    const normalizedEmail = normalizeEmail(email);
    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
            id: true,
            email: true,
            isVerified: true,
        },
    });

    if (!user || user.isVerified) {
        return;
    }

    await createAndSendVerificationCode(user.id, user.email);
}
