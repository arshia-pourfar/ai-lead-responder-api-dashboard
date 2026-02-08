import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    try {
        const { name, email, password } = await req.json();
        if (!name || !email || !password)
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing)
            return NextResponse.json({ error: "User already exists" }, { status: 400 });

        const hashedPassword = await hash(password, 10);
        const accessCode = crypto.randomBytes(8).toString("hex");

        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword, accessCode },
        });

        return NextResponse.json({ id: user.id, email: user.email });
    } catch (err) {
        console.log(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
