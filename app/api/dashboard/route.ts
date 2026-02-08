import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    try {
        if (path === "emails") {
            const emails = await prisma.email.findMany({
                include: { account: true },
                orderBy: { createdAt: "desc" },
            });
            return NextResponse.json(emails);
        }

        if (path === "unread") {
            const unreadEmails = await prisma.email.findMany({
                where: { tag: "unread" },
                orderBy: { createdAt: "desc" },
            });
            return NextResponse.json(unreadEmails);
        }

        if (path === "responses") {
            const responses = await prisma.email.findMany({
                include: { account: true },
                orderBy: { createdAt: "desc" },
            });

            const formatted = responses.map((e) => ({
                id: e.id,
                to: e.account?.email || null,
                subject: e.subject,
                reply: e.aiReply || "",
                status: e.status,
                tag: e.tag,
                createdAt: e.createdAt,
            }));

            return NextResponse.json(formatted);
        }

        if (path === "analytics") {
            const tags = await prisma.email.groupBy({
                by: ["tag"],
                _count: { tag: true },
            });

            const statuses = await prisma.email.groupBy({
                by: ["status"],
                _count: { status: true },
            });

            return NextResponse.json({ tags, statuses });
        }

        return NextResponse.json({ error: "Not found" }, { status: 404 });
    } catch (err) {
        console.error("Dashboard route error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
