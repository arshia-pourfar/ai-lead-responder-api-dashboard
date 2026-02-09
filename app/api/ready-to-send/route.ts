import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authGuard } from "@/lib/middleware/authMiddleware";

export async function GET(req: NextRequest) {
    const user = authGuard(req);
    if (!user || typeof user !== "object" || !("id" in user)) {
        return NextResponse.json([], { status: 401 });
    }

    try {
        const emails = await prisma.email.findMany({
            where: { userId: user.id, readyToSend: true },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(
            emails.map(e => ({
                id: e.id,
                subject: e.subject,
                body: e.body,
                aiReply: e.aiReply,
                tag: "ready" as const,
            }))
        );
    } catch (err) {
        console.error(err);
        return NextResponse.json([], { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const user = authGuard(req);
    if (!user || typeof user !== "object" || !("id" in user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.emailId) return NextResponse.json({ error: "emailId required" }, { status: 400 });

    try {
        const email = await prisma.email.findFirst({
            where: { id: body.emailId, userId: user.id },
        });
        if (!email) return NextResponse.json({ error: "Email not found" }, { status: 404 });

        await prisma.email.update({
            where: { id: body.emailId },
            data: { status: "sent", tag: "sent", readyToSend: false },
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Send failed" }, { status: 500 });
    }
}
