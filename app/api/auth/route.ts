import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";

function generateAccessCode() {
    return Math.random().toString(36).substring(2, 18); // 16 chars
}

export async function POST(req: NextRequest) {
    try {
        const { name, email, password } = await req.json();

        if (!name || !email || !password)
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser)
            return NextResponse.json({ error: "User already exists" }, { status: 400 });

        const hashedPassword = await hash(password, 10);
        const accessCode = generateAccessCode();

        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword, accessCode },
        });

        return NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
