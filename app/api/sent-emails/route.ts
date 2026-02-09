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
            where: { userId: user.id, status: "sent" },
            include: { account: true },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(
            emails.map(e => ({
                id: e.id,
                subject: e.subject,
                sender: e.account?.email ?? "unknown",
                tag: "sent" as const,
            }))
        );
    } catch (err) {
        console.error(err);
        return NextResponse.json([], { status: 500 });
    }
}
