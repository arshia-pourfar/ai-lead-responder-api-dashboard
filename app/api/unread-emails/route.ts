import { NextRequest, NextResponse } from "next/server";
import { readUnreadEmails, Email } from "@/lib/services/readEmail";
import prisma from "@/lib/prisma";
import { authGuard } from "@/lib/middleware/authMiddleware";

interface UnreadEmailResponse {
    id: string;
    subject: string;
    sender: string;
    body: string;
    aiReply: string;
    manualReply: string;
    status: "unread";
    tag: "unread";
    category: string;
    createdAt: string;
}

interface ApproveBody {
    emailId?: string;
    subject: string;
    body?: string;
    sender: string;
    text: string;
    category?: string;
}

export async function GET(req: NextRequest) {
    try {
        const limitParam = req.nextUrl.searchParams.get("limit");
        const limit = limitParam ? parseInt(limitParam) : 5; // محدودیت پیشفرض

        const emails: Email[] = await readUnreadEmails(limit);

        if (!emails || emails.length === 0) {
            return NextResponse.json<UnreadEmailResponse[]>([], { status: 200 });
        }

        const formatted: UnreadEmailResponse[] = emails.map((e, i) => ({
            id: String(i),
            subject: e.subject ?? "(No Subject)",
            sender: e.from ?? "unknown",  // ← اینجا
            body: e.text ?? "",
            aiReply: "",
            manualReply: "",
            status: "unread",
            tag: "unread",
            category: "general",
            createdAt: new Date().toISOString(),
        }));


        return NextResponse.json(formatted, { status: 200 });
    } catch (err) {
        console.error("UNREAD EMAILS ERROR:", err);
        return NextResponse.json([], { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = authGuard(req);
        if (!user || typeof user !== "object" || !("id" in user)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body: ApproveBody = await req.json();

        if (!body.subject || !body.text || !body.sender) {
            return NextResponse.json(
                { error: "subject, text and sender required" },
                { status: 400 }
            );
        }

        const emailData = {
            subject: body.subject,
            body: body.body ?? "",
            aiReply: body.text,
            manualReply: body.text,
            category: body.category ?? "support",
            tag: "read",
            status: "ready_send",
            readyToSend: true,
            userId: user.id,
            senderEmail: body.sender, // ایمیل فرستنده اضافه شد
        };

        // استفاده از upsert برای جلوگیری از خطای P2025
        const email = await prisma.email.upsert({
            where: { id: body.emailId ?? "" }, // اگر emailId نبود، Prisma خودش id میده
            update: emailData,
            create: {
                ...emailData,
                id: body.emailId ?? undefined,
            },
        });

        return NextResponse.json(
            { success: true, emailId: email.id },
            { status: 200 }
        );
    } catch (err) {
        console.error("APPROVE MODEL ERROR:", err);
        return NextResponse.json({ error: "Failed to approve email" }, { status: 500 });
    }
}
