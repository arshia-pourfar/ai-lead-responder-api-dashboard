import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authGuard } from "@/lib/middleware/authMiddleware";
import { sendAutoReply } from "@/lib/services/email";

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
                sender: e.senderEmail ?? "unknown",
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
    if (!body?.emailId) {
        return NextResponse.json({ error: "emailId required" }, { status: 400 });
    }

    const { emailId, manualReply, aiReply, saveOnly } = body;

    try {
        const email = await prisma.email.findFirst({
            where: { id: emailId, userId: user.id },
            include: { account: true },
        });

        if (!email) {
            return NextResponse.json({ error: "Email not found" }, { status: 404 });
        }

        // ---------- ذخیره بدون ارسال ----------
        if (saveOnly) {
            await prisma.email.update({
                where: { id: emailId },
                data: {
                    aiReply: aiReply !== undefined ? aiReply : email.aiReply,
                    manualReply: manualReply !== undefined ? manualReply : email.manualReply,
                },
            });
            // مهم: اگر saveOnly هست، همینجا پایان میدیم و ایمیل ارسال نمی‌شه
            return NextResponse.json({ success: true, saved: true });
        }

        // ---------- ارسال ایمیل فقط وقتی saveOnly نیست ----------
        const replyText =
            manualReply && manualReply.trim() !== ""
                ? manualReply
                : aiReply ?? email.aiReply ?? "";

        const targetEmail = email.senderEmail;

        const sent = await sendAutoReply(
            targetEmail || "",
            replyText,
            email.category || "support"
        );

        if (!sent) {
            return NextResponse.json({ error: "Email send failed" }, { status: 500 });
        }

        // آپدیت دیتابیس بعد از ارسال
        await prisma.email.update({
            where: { id: emailId },
            data: {
                status: "sent",
                tag: "sent",
                readyToSend: false,
                manualReply: manualReply || replyText,
                aiReply: aiReply || replyText,
            },
        });

        return NextResponse.json({ success: true, sent: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Send failed" }, { status: 500 });
    }
}
