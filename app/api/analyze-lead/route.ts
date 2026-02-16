import { NextRequest, NextResponse } from "next/server";
import { analyzeLead } from "@/lib/services/gemini";
import { detectCategory, normalizeCategory } from "@/lib/services/classifier";
import { sendAutoReply } from "@/lib/services/email";
import { PrismaClient } from "@prisma/client";
import { authGuard } from "@/lib/middleware/authMiddleware";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const { message, email, subject, userId, accountId, category } = await req.json();
    const authUser = authGuard(req);
    const authUserId =
        authUser && typeof authUser === "object" && "id" in authUser
            ? String(authUser.id)
            : "";
    const requestedUserId = typeof userId === "string" ? userId : "";

    if (authUserId && requestedUserId && authUserId !== requestedUserId) {
        return NextResponse.json({ error: "Unauthorized user context" }, { status: 403 });
    }

    const effectiveUserId = authUserId || requestedUserId;

    if (!message || !email || !subject || !effectiveUserId) {
        return NextResponse.json(
            { error: "message, email, subject, userId are required" },
            { status: 400 }
        );
    }

    try {
        const detectedCategory = category
            ? normalizeCategory(category)
            : await detectCategory(message, effectiveUserId);

        const { reply } = await analyzeLead(detectedCategory, message, effectiveUserId);

        const dbEmail = await prisma.email.create({
            data: {
                subject,
                body: message,
                aiReply: reply,
                category: detectedCategory,
                status: "sent",
                tag: "sent",
                readyToSend: false,
                readyToSell: detectedCategory === "sales",
                userId: effectiveUserId,
                accountId: accountId || null,
            },
        });

        await sendAutoReply(email, reply, detectedCategory, effectiveUserId);

        return NextResponse.json({
            category: detectedCategory,
            reply,
            emailSent: true,
            dbEmail,
        });
    } catch (err) {
        console.error("AnalyzeLead error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
