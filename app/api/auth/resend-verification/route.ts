import { NextRequest, NextResponse } from "next/server";
import {
    normalizeEmail,
    resendVerificationCode,
} from "@/lib/services/auth/emailVerificationService";
import {
    getFirstValidationError,
    resendVerificationSchema,
} from "@/lib/validation/authSchemas";

const GENERIC_RESPONSE = {
    // Keep response generic so callers cannot enumerate registered emails.
    message: "If an account exists, a new verification code has been sent.",
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);
        const parsed = resendVerificationSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: getFirstValidationError(parsed.error) },
                { status: 400 }
            );
        }

        try {
            await resendVerificationCode(normalizeEmail(parsed.data.email));
        } catch {
            return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
        }

        return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
    } catch {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
