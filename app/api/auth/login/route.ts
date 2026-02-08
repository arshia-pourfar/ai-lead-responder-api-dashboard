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

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

        return NextResponse.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
