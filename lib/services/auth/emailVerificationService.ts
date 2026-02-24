import crypto from "crypto";
import { compare, hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/services/mailer";

const VERIFICATION_CODE_DIGITS = 6;
const VERIFICATION_CODE_EXPIRY_MINUTES = 10;
const ACCESS_CODE_BYTES = 8;
const ACCESS_CODE_MAX_RETRIES = 3;

interface PendingRegistrationPayload {
    name: string;
    email: string;
    passwordHash: string;
}

interface PendingRegistrationRow {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    verificationCode: string;
    verificationCodeExpiresAt: Date;
}

function generateVerificationCode() {
    return crypto
        .randomInt(0, 10 ** VERIFICATION_CODE_DIGITS)
        .toString()
        .padStart(VERIFICATION_CODE_DIGITS, "0");
}

function generateAccessCode() {
    return crypto.randomBytes(ACCESS_CODE_BYTES).toString("hex");
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

async function sendVerificationCodeEmail(email: string, code: string) {
    const template = buildVerificationEmailTemplate(code);
    await sendEmail({
        to: email,
        subject: template.subject,
        text: template.text,
        html: template.html,
    });
}

function isUniqueConstraintErrorOnField(error: unknown, fieldName: string): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
    if (error.code !== "P2002") return false;

    const target = error.meta?.target;
    if (Array.isArray(target)) {
        return target.includes(fieldName);
    }
    if (typeof target === "string") {
        return target.includes(fieldName);
    }

    return false;
}

async function createVerifiedUserFromPending(pending: PendingRegistrationRow): Promise<boolean> {
    for (let attempt = 0; attempt < ACCESS_CODE_MAX_RETRIES; attempt += 1) {
        try {
            await prisma.$transaction(async (tx) => {
                const existingVerified = await tx.user.findFirst({
                    where: { email: pending.email, isVerified: true },
                    select: { id: true },
                });

                if (existingVerified) {
                    await tx.pendingRegistration.deleteMany({
                        where: { email: pending.email },
                    });
                    throw new Error("EMAIL_ALREADY_VERIFIED");
                }

                await tx.user.deleteMany({
                    where: { email: pending.email, isVerified: false },
                });

                await tx.user.create({
                    data: {
                        name: pending.name,
                        email: pending.email,
                        password: pending.passwordHash,
                        accessCode: generateAccessCode(),
                        isVerified: true,
                        verificationCode: null,
                        verificationCodeExpiresAt: null,
                    },
                });

                await tx.pendingRegistration.deleteMany({
                    where: { email: pending.email },
                });
            });

            return true;
        } catch (error) {
            if (error instanceof Error && error.message === "EMAIL_ALREADY_VERIFIED") {
                return false;
            }

            if (isUniqueConstraintErrorOnField(error, "accessCode")) {
                continue;
            }

            if (isUniqueConstraintErrorOnField(error, "email")) {
                await prisma.pendingRegistration.deleteMany({
                    where: { email: pending.email },
                });
                return false;
            }

            throw error;
        }
    }

    throw new Error("Could not finalize registration due to unique access code collision.");
}

async function verifyLegacyUserCode(email: string, code: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { email },
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

export function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

export async function createAndSendPendingVerificationCode(
    payload: PendingRegistrationPayload
) {
    const code = generateVerificationCode();
    const verificationCode = await hash(code, 10);
    const verificationCodeExpiresAt = getVerificationExpiryDate();

    await prisma.pendingRegistration.upsert({
        where: { email: payload.email },
        create: {
            name: payload.name,
            email: payload.email,
            passwordHash: payload.passwordHash,
            verificationCode,
            verificationCodeExpiresAt,
        },
        update: {
            name: payload.name,
            passwordHash: payload.passwordHash,
            verificationCode,
            verificationCodeExpiresAt,
            createdAt: new Date(),
        },
    });

    await sendVerificationCodeEmail(payload.email, code);
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

    await sendVerificationCodeEmail(email, code);
}

export async function verifyEmailCode(email: string, code: string) {
    const normalizedEmail = normalizeEmail(email);
    const pending = await prisma.pendingRegistration.findUnique({
        where: { email: normalizedEmail },
        select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            verificationCode: true,
            verificationCodeExpiresAt: true,
        },
    });

    if (pending) {
        if (pending.verificationCodeExpiresAt.getTime() < Date.now()) {
            await prisma.pendingRegistration.deleteMany({
                where: { email: normalizedEmail },
            });
            return false;
        }

        const isCodeValid = await compare(code, pending.verificationCode);
        if (!isCodeValid) {
            return false;
        }

        return createVerifiedUserFromPending(pending);
    }

    return verifyLegacyUserCode(normalizedEmail, code);
}

export async function resendVerificationCode(email: string) {
    const normalizedEmail = normalizeEmail(email);

    const pending = await prisma.pendingRegistration.findUnique({
        where: { email: normalizedEmail },
        select: { email: true },
    });

    if (pending) {
        const code = generateVerificationCode();
        const verificationCode = await hash(code, 10);
        const verificationCodeExpiresAt = getVerificationExpiryDate();

        await prisma.pendingRegistration.update({
            where: { email: normalizedEmail },
            data: {
                verificationCode,
                verificationCodeExpiresAt,
            },
        });

        await sendVerificationCodeEmail(normalizedEmail, code);
        return;
    }

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

