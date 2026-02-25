import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import {
    createAndSendPendingVerificationCode,
    normalizeEmail,
} from "@/lib/services/auth/emailVerificationService";

type RegistrationErrorCode =
    | "USER_EXISTS"
    | "EMAIL_SEND_FAILED"
    | "DB_MIGRATION_REQUIRED"
    | "DB_UNAVAILABLE";

export class RegistrationError extends Error {
    code: RegistrationErrorCode;

    constructor(code: RegistrationErrorCode, message: string) {
        super(message);
        this.code = code;
    }
}

function getEmailSendFailureMessage(error: unknown): string {
    if (!(error instanceof Error)) {
        return "Could not send verification email. Please try resending the code.";
    }

    const message = error.message.toLowerCase();

    if (
        message.includes("missing email config") ||
        message.includes("email_port/smtp_port")
    ) {
        return "Email service is not configured. Set EMAIL_USER/EMAIL_PASS (or SMTP_USER/SMTP_PASS, SMTP_USERNAME/SMTP_PASSWORD, MAIL_USER/MAIL_PASS). EMAIL_HOST/EMAIL_PORT are optional.";
    }

    if (
        message.includes("invalid login") ||
        message.includes("authentication") ||
        message.includes("username and password not accepted") ||
        message.includes("535")
    ) {
        return "SMTP authentication failed. Check EMAIL_USER and EMAIL_PASS (for Gmail, use a 16-digit App Password).";
    }

    if (message.includes("no recipients defined")) {
        return "Recipient email is invalid. Enter a valid email address and try again.";
    }

    return "Could not send verification email. Please try resending the code.";
}

export async function registerUser({
    name,
    email,
    password,
}: {
    name: string;
    email: string;
    password: string;
}) {
    const normalizedEmail = normalizeEmail(email);
    const trimmedName = name.trim();

    const existingVerifiedUser = await prisma.user.findFirst({
        where: {
            email: normalizedEmail,
            isVerified: true,
        },
        select: { id: true },
    });
    if (existingVerifiedUser) {
        throw new RegistrationError("USER_EXISTS", "User already exists.");
    }

    await prisma.user.deleteMany({
        where: {
            email: normalizedEmail,
            isVerified: false,
        },
    });

    const hashedPassword = await hash(password, 10);

    try {
        await createAndSendPendingVerificationCode({
            name: trimmedName,
            email: normalizedEmail,
            passwordHash: hashedPassword,
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2021") {
                throw new RegistrationError(
                    "DB_MIGRATION_REQUIRED",
                    "Database migration is missing. Run `npx prisma migrate deploy` and try again."
                );
            }

            if (error.code === "P1001" || error.code === "P2024" || error.code === "P1008") {
                throw new RegistrationError(
                    "DB_UNAVAILABLE",
                    "Database is temporarily unavailable. Please try again shortly."
                );
            }
        }

        console.error("Registration verification email failed:", error);
        throw new RegistrationError("EMAIL_SEND_FAILED", getEmailSendFailureMessage(error));
    }

    return {
        email: normalizedEmail,
    };
}

