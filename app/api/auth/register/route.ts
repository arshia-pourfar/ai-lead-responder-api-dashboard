import { NextRequest, NextResponse } from "next/server";
import { registerUser, RegistrationError } from "@/lib/services/auth/registrationService";
import {
    getFirstValidationError,
    registerSchema,
} from "@/lib/validation/authSchemas";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);
        const parsed = registerSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: getFirstValidationError(parsed.error) },
                { status: 400 }
            );
        }

        const user = await registerUser(parsed.data);
        return NextResponse.json(
            {
                email: user.email,
                message: "Signup successful. Please verify your email with the code we sent.",
            },
            { status: 201 }
        );
    } catch (err) {
        if (err instanceof RegistrationError) {
            if (err.code === "USER_EXISTS") {
                return NextResponse.json({ error: err.message }, { status: 400 });
            }

            if (err.code === "EMAIL_SEND_FAILED") {
                return NextResponse.json({ error: err.message }, { status: 500 });
            }
        }

        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
