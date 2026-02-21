import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";
import jwt from "jsonwebtoken";
import {
    getFirstValidationError,
    loginSchema,
} from "@/lib/validation/authSchemas";
import { normalizeEmail } from "@/lib/services/auth/emailVerificationService";

const JWT_SECRET = process.env.JWT_SECRET || "secret123";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);
        const parsed = loginSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: getFirstValidationError(parsed.error) },
                { status: 400 }
            );
        }

        const email = normalizeEmail(parsed.data.email);
        const { password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        const valid = await compare(password, user.password);
        if (!valid) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        if (!user.isVerified) {
            return NextResponse.json(
                { error: "Please verify your email first." },
                { status: 403 }
            );
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
            expiresIn: "7d",
        });

        const res = NextResponse.json({
            message: "Logged in successfully",
            token,
            user: { id: user.id, name: user.name, email: user.email },
        });

        res.cookies.set("auth_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60,
        });

        return res;
    } catch (err) {
        console.error("Login error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
