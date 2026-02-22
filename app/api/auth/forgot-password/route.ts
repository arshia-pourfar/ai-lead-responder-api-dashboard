import { NextRequest, NextResponse } from "next/server";
import {
    forgotPasswordSchema,
    getFirstValidationError,
} from "@/lib/validation/authSchemas";
import { requestPasswordReset } from "@/lib/services/auth/passwordResetService";

export const runtime = "nodejs";

const GENERIC_RESPONSE_MESSAGE =
    "If an account exists with this email, a reset link has been sent.";

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null);
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: getFirstValidationError(parsed.error) },
            { status: 400 }
        );
    }

    try {
        await requestPasswordReset(parsed.data.email);
    } catch (error) {
        console.error("Forgot password request failed:", error);
    }

    return NextResponse.json({ message: GENERIC_RESPONSE_MESSAGE }, { status: 200 });
}
