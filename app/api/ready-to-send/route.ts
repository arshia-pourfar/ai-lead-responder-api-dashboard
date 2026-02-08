import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authGuard } from "@/lib/middleware/authMiddleware";

export async function GET(req: NextRequest) {
    const user = authGuard(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const emails = await prisma.email.findMany({
            where: { readyToSend: true },
            orderBy: { createdAt: "desc" }
        });
        return NextResponse.json(emails);
    } catch (err) {
        console.error(err);
        return NextResponse.json([], { status: 500 });
    }
}
