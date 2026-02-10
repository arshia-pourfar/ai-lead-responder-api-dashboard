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
            where: { userId: user.id, readyToSell: true },
            include: { account: true },
            orderBy: { createdAt: "desc" },
        });

        const response = emails.map(e => ({
            id: e.id,
            subject: e.subject || "No subject",
            sender: e.account?.email ?? "unknown",
            tag: "important" as const,
            body: e.body || "No body available", // اضافه شد
            aiReply: e.aiReply || "",            // خالی در صورت نبود
            // sellScore: e.sellScore ?? 0,        // همیشه عدد
            accountId: e.accountId,
            createdAt: e.createdAt,
        }));

        return NextResponse.json(response);
    } catch (err) {
        console.error(err);
        return NextResponse.json([], { status: 500 });
    }
}
