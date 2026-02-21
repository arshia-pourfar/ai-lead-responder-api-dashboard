import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/security/rateLimit";
import { verifyEmailCode, normalizeEmail } from "@/lib/services/auth/emailVerificationService";
import {
    getFirstValidationError,
    verifyEmailSchema,
} from "@/lib/validation/authSchemas";

function getClientIp(req: NextRequest) {
    const forwardedFor = req.headers.get("x-forwarded-for");
    if (forwardedFor) {
        const firstAddress = forwardedFor.split(",")[0]?.trim();
        if (firstAddress) {
            return firstAddress;
        }
    }

    return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);
        const parsed = verifyEmailSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: getFirstValidationError(parsed.error) },
                { status: 400 }
            );
        }

        const normalizedEmail = normalizeEmail(parsed.data.email);
        const key = `verify-email:${getClientIp(req)}:${normalizedEmail}`;
        const rateLimit = consumeRateLimit(key, 5, 60_000);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "Too many attempts. Please try again later." },
                {
                    status: 429,
                    headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
                }
            );
        }

        const isVerified = await verifyEmailCode(normalizedEmail, parsed.data.code.trim());
        if (!isVerified) {
            return NextResponse.json(
                { error: "Invalid or expired verification code." },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { message: "Email verified successfully." },
            { status: 200 }
        );
    } catch {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
