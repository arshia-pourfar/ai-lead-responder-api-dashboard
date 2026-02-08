import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authGuard } from "@/lib/middleware/authMiddleware";
import { JwtPayload } from "jsonwebtoken";

export async function GET(req: NextRequest) {
    const user = authGuard(req);

    if (!user || typeof user === "string" || !("id" in user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (user as JwtPayload).id as string;

    try {
        const sentEmails = await prisma.email.findMany({
            where: { status: "sent", userId },
            include: { account: true },
            orderBy: { createdAt: "desc" },
        });

        const formatted = sentEmails.map((e) => ({
            id: e.id,
            subject: e.subject,
            sender: e.account?.email ?? "unknown",
            tag: "sent" as const,
        }));

        return NextResponse.json(formatted);
    } catch (err) {
        console.error("Error fetching sent emails:", err);
        return NextResponse.json([], { status: 500 });
    }
}
