import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import {
    createAndSendPendingVerificationCode,
    normalizeEmail,
} from "@/lib/services/auth/emailVerificationService";

export class RegistrationError extends Error {
    code: "USER_EXISTS" | "EMAIL_SEND_FAILED";

    constructor(code: "USER_EXISTS" | "EMAIL_SEND_FAILED", message: string) {
        super(message);
        this.code = code;
    }
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
        if (
            error instanceof Error &&
            (error.message.toLowerCase().includes("missing email config") ||
                error.message.toLowerCase().includes("email_port/smtp_port"))
        ) {
            throw new RegistrationError(
                "EMAIL_SEND_FAILED",
                "Email service is not configured. Set EMAIL_USER/EMAIL_PASS (or SMTP_USER/SMTP_PASS, SMTP_USERNAME/SMTP_PASSWORD, MAIL_USER/MAIL_PASS). EMAIL_HOST/EMAIL_PORT are optional."
            );
        }

        throw new RegistrationError(
            "EMAIL_SEND_FAILED",
            "Could not send verification email. Please try resending the code."
        );
    }

    return {
        email: normalizedEmail,
    };
}

