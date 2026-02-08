// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "secret123";

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();
        if (!email || !password)
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user)
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

        const valid = await compare(password, user.password);
        if (!valid)
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

        // ایجاد توکن JWT
        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        // قرار دادن توکن داخل HttpOnly cookie
        const res = NextResponse.json({
            message: "Logged in successfully",
            user: { id: user.id, name: user.name, email: user.email },
        });

        res.cookies.set("auth_token", token, {
            httpOnly: true,     // دسترسی فقط از سرور
            secure: process.env.NODE_ENV === "production", // فقط https در production
            sameSite: "lax",
            path: "/",          // همه مسیرها می‌تونن از کوکی استفاده کنند
            maxAge: 7 * 24 * 60 * 60 // 7 روز
        });

        return res;
    } catch (err) {
        console.error("Login error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
