import { NextRequest, NextResponse } from "next/server";
import { readUnreadEmailsPaginated, Email, markEmailAsSeenByUid } from "@/lib/services/readEmail";
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

interface UnreadEmailsGetResponse {
    emails: UnreadEmailResponse[];
    total: number;
}

interface ApproveBody {
    emailId?: string;
    ignore?: boolean;
    subject?: string;
    body?: string;
    sender?: string;
    text?: string;
    category?: string;
}

interface ReadyEmailResponse {
    id: string;
    subject: string;
    sender: string;
    body: string;
    aiReply: string;
    manualReply: string;
    tag: "ready";
}

const CACHE_TTL_MS = 10_000;
const unreadCache = new Map<string, { expiresAt: number; payload: UnreadEmailsGetResponse }>();

export async function GET(req: NextRequest) {
    try {
        const limitParam = req.nextUrl.searchParams.get("limit");
        const offsetParam = req.nextUrl.searchParams.get("offset");
        const hasOffsetParam = req.nextUrl.searchParams.has("offset");
        const parsedLimit = Number.parseInt(limitParam ?? "50", 10);
        const parsedOffset = Number.parseInt(offsetParam ?? "0", 10);
        const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50;
        const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
        const effectiveOffset = hasOffsetParam ? offset : 0;

        const cacheKey = `${limit}:${effectiveOffset}`;
        const now = Date.now();
        const cached = unreadCache.get(cacheKey);
        if (cached && cached.expiresAt > now) {
            return NextResponse.json<UnreadEmailsGetResponse>(cached.payload, { status: 200 });
        }

        const unread = await readUnreadEmailsPaginated(limit, effectiveOffset);
        const pageUnreadEmails = unread.emails;

        const formatted: UnreadEmailResponse[] = pageUnreadEmails.map((e: Email) => ({
            id: String(e.uid),
            subject: e.subject ?? "(No Subject)",
            sender: e.from ?? "unknown",
            body: e.text ?? "",
            aiReply: "",
            manualReply: "",
            status: "unread",
            tag: "unread",
            category: "general",
            createdAt: new Date().toISOString(),
        }));

        const payload: UnreadEmailsGetResponse = { emails: formatted, total: unread.total };
        unreadCache.set(cacheKey, { expiresAt: now + CACHE_TTL_MS, payload });

        return NextResponse.json<UnreadEmailsGetResponse>(payload, { status: 200 });
    } catch (err) {
        console.error("UNREAD EMAILS ERROR:", err);
        return NextResponse.json<UnreadEmailsGetResponse>(
            { emails: [], total: 0 },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = authGuard(req);
        if (!user || typeof user !== "object" || !("id" in user)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body: ApproveBody = await req.json();

        if (body.ignore) {
            const uid = Number.parseInt(body.emailId ?? "", 10);
            if (!Number.isFinite(uid) || uid <= 0) {
                return NextResponse.json({ error: "Valid emailId is required for ignore" }, { status: 400 });
            }

            await markEmailAsSeenByUid(uid);
            unreadCache.clear();
            return NextResponse.json({ success: true, ignored: true, emailId: body.emailId }, { status: 200 });
        }

        if (!body.subject || !body.text || !body.sender) {
            return NextResponse.json(
                { error: "subject, text and sender required" },
                { status: 400 }
            );
        }

        const uid = Number.parseInt(body.emailId ?? "", 10);
        if (!Number.isFinite(uid) || uid <= 0) {
            return NextResponse.json({ error: "Valid emailId is required for approve" }, { status: 400 });
        }

        await markEmailAsSeenByUid(uid);
        unreadCache.clear();

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
            senderEmail: body.sender,
        };

        const email = await prisma.email.create({
            data: emailData,
        });

        const readyEmail: ReadyEmailResponse = {
            id: email.id,
            subject: email.subject,
            sender: email.senderEmail ?? "unknown",
            body: email.body,
            aiReply: email.aiReply ?? "",
            manualReply: email.manualReply ?? "",
            tag: "ready",
        };

        return NextResponse.json(
            { success: true, emailId: email.id, readyEmail },
            { status: 200 }
        );
    } catch (err) {
        console.error("APPROVE MODEL ERROR:", err);
        return NextResponse.json({ error: "Failed to approve email" }, { status: 500 });
    }
}
