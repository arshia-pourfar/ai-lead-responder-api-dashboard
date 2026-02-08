// lib/middleware/apiKeyMiddleware.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "../prisma";

export async function checkApiKey(req: NextRequest) {
    // API Key از کوکی بخون
    const apiKey = req.cookies.get("api_key")?.value;

    if (!apiKey) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { apiKey } });
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return user;
}
