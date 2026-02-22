import { NextRequest, NextResponse } from "next/server";
import {
    getFirstValidationError,
    resetPasswordSchema,
} from "@/lib/validation/authSchemas";
import { resetPasswordWithToken } from "@/lib/services/auth/passwordResetService";

function isInvalidOrExpiredTokenError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return (
        message.includes("invalid reset token") ||
        message.includes("jwt expired") ||
        message.includes("jwt malformed") ||
        message.includes("invalid token")
    );
}

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null);
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: getFirstValidationError(parsed.error) },
            { status: 400 }
        );
    }

    try {
        await resetPasswordWithToken(parsed.data.token, parsed.data.password);
        return NextResponse.json(
            { message: "Password has been reset successfully." },
            { status: 200 }
        );
    } catch (error) {
        if (isInvalidOrExpiredTokenError(error)) {
            return NextResponse.json(
                { error: "Reset link is invalid or expired." },
                { status: 400 }
            );
        }

        console.error("Reset password failed:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
