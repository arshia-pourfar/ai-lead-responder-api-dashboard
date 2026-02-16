import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authGuard } from "@/lib/middleware/authMiddleware";
import { sendAutoReplyDetailed } from "@/lib/services/email";
import { detectCategory } from "@/lib/services/classifier";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type CategoryFilter = string;
type ConfidenceFilter = "all" | "high" | "medium" | "low";
type DateFilter = "all" | "today" | "7d" | "30d" | "90d";
type SortFilter =
    | "newest"
    | "oldest"
    | "subject_asc"
    | "subject_desc"
    | "sender_asc"
    | "sender_desc"
    | "confidence_asc"
    | "confidence_desc";

function normalizeCategoryFilter(value: string | null): CategoryFilter {
    const normalized = (value || "ready").trim().toLowerCase();
    return normalized || "ready";
}

function normalizeConfidenceFilter(value: string | null): ConfidenceFilter {
    const normalized = (value || "all").toLowerCase();
    if (normalized === "all" || normalized === "high" || normalized === "medium" || normalized === "low") {
        return normalized;
    }
    return "all";
}

function normalizeDateFilter(value: string | null): DateFilter {
    const normalized = (value || "all").toLowerCase();
    if (normalized === "all" || normalized === "today" || normalized === "7d" || normalized === "30d" || normalized === "90d") {
        return normalized;
    }
    return "all";
}

function normalizeSortFilter(value: string | null): SortFilter {
    const normalized = (value || "newest").toLowerCase();
    if (
        normalized === "newest" ||
        normalized === "oldest" ||
        normalized === "subject_asc" ||
        normalized === "subject_desc" ||
        normalized === "sender_asc" ||
        normalized === "sender_desc" ||
        normalized === "confidence_asc" ||
        normalized === "confidence_desc"
    ) {
        return normalized;
    }
    return "newest";
}

function getCategoryWhere(category: CategoryFilter): Prisma.EmailWhereInput {
    if (category === "all") return {};
    if (category === "unread") return { tag: "unread" };
    if (category === "important") {
        return {
            OR: [{ readyToSell: true }, { tag: "important" }, { category: "sales" }],
        };
    }
    if (category === "sent") return { OR: [{ status: "sent" }, { tag: "sent" }] };
    if (category === "ready") return { OR: [{ readyToSend: true }, { status: "ready_send" }] };
    return { category };
}

function getConfidenceWhere(confidence: ConfidenceFilter): Prisma.EmailWhereInput {
    const manualExists: Prisma.EmailWhereInput = {
        AND: [{ manualReply: { not: null } }, { manualReply: { not: "" } }],
    };
    const aiExists: Prisma.EmailWhereInput = {
        AND: [{ aiReply: { not: null } }, { aiReply: { not: "" } }],
    };

    if (confidence === "high") return manualExists;
    if (confidence === "medium") {
        return {
            AND: [
                aiExists,
                {
                    OR: [{ manualReply: null }, { manualReply: "" }],
                },
            ],
        };
    }
    if (confidence === "low") return { OR: [{ aiReply: null }, { aiReply: "" }] };
    return {};
}

function getDateWhere(dateFilter: DateFilter): Prisma.EmailWhereInput {
    if (dateFilter === "all") return {};

    const now = new Date();
    if (dateFilter === "today") {
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        return { createdAt: { gte: startOfDay } };
    }

    const days = dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : 90;
    const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return { createdAt: { gte: fromDate } };
}

function getOrderBy(sort: SortFilter): Prisma.EmailOrderByWithRelationInput {
    if (sort === "oldest") return { createdAt: "asc" };
    if (sort === "subject_asc") return { subject: "asc" };
    if (sort === "subject_desc") return { subject: "desc" };
    if (sort === "sender_asc") return { senderEmail: "asc" };
    if (sort === "sender_desc") return { senderEmail: "desc" };
    return { createdAt: "desc" };
}

function getConfidenceRank(email: { manualReply: string | null; aiReply: string | null; category: string; readyToSell: boolean }): number {
    const manual = (email.manualReply || "").trim();
    const ai = (email.aiReply || "").trim();

    if (email.readyToSell || email.category === "sales") return 3;
    if (manual) return 3;
    if (ai) return 2;
    return 1;
}

function getConfidenceLabel(rank: number): "high" | "medium" | "low" {
    if (rank >= 3) return "high";
    if (rank === 2) return "medium";
    return "low";
}

function getPaginationParams(req: NextRequest): { enabled: boolean; limit: number; offset: number } {
    const hasLimit = req.nextUrl.searchParams.has("limit");
    const hasOffset = req.nextUrl.searchParams.has("offset");
    const rawLimit = Number.parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10);
    const rawOffset = Number.parseInt(req.nextUrl.searchParams.get("offset") ?? "0", 10);

    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

    return { enabled: hasLimit || hasOffset, limit, offset };
}

function mapEmailResponse(email: {
    id: string;
    subject: string;
    body: string;
    aiReply: string | null;
    manualReply: string | null;
    senderEmail: string | null;
    category: string;
    createdAt: Date;
    readyToSell: boolean;
}): {
    id: string;
    subject: string;
    body: string;
    aiReply: string | null;
    manualReply: string | null;
    sender: string;
    category: string;
    confidence: "high" | "medium" | "low";
    createdAt: Date;
    tag: "ready";
} {
    return {
        id: email.id,
        subject: email.subject,
        body: email.body,
        aiReply: email.aiReply,
        manualReply: email.manualReply,
        sender: email.senderEmail ?? "unknown",
        category: email.category,
        confidence: getConfidenceLabel(getConfidenceRank(email)),
        createdAt: email.createdAt,
        tag: "ready",
    };
}

interface ReadyToSendBody {
    emailId?: string;
    subject?: string;
    body?: string;
    sender?: string;
    manualReply?: string;
    aiReply?: string;
    saveOnly?: boolean;
    sendNow?: boolean;
}

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function pickFinalReply(manualReply?: string, aiReply?: string): string {
    const manual = (manualReply || "").trim();
    if (manual) return manual;
    return (aiReply || "").trim();
}

export async function GET(req: NextRequest) {
    const user = authGuard(req);
    if (!user || typeof user !== "object" || !("id" in user)) {
        return NextResponse.json([], { status: 401 });
    }

    try {
        const categoryFilter = normalizeCategoryFilter(req.nextUrl.searchParams.get("category"));
        const confidenceFilter = normalizeConfidenceFilter(req.nextUrl.searchParams.get("confidence"));
        const dateFilter = normalizeDateFilter(req.nextUrl.searchParams.get("date"));
        const sortFilter = normalizeSortFilter(req.nextUrl.searchParams.get("sort"));
        const confidenceSort = sortFilter === "confidence_asc" || sortFilter === "confidence_desc";
        const pagination = getPaginationParams(req);

        const where: Prisma.EmailWhereInput = {
            userId: user.id,
            AND: [
                getCategoryWhere(categoryFilter),
                getConfidenceWhere(confidenceFilter),
                getDateWhere(dateFilter),
            ],
        };

        if (pagination.enabled && !confidenceSort) {
            const [total, emails] = await Promise.all([
                prisma.email.count({ where }),
                prisma.email.findMany({
                    where,
                    orderBy: getOrderBy(sortFilter),
                    skip: pagination.offset,
                    take: pagination.limit,
                }),
            ]);

            return NextResponse.json({
                emails: emails.map(mapEmailResponse),
                total,
                limit: pagination.limit,
                offset: pagination.offset,
            });
        }

        const emails = await prisma.email.findMany({
            where,
            orderBy: confidenceSort ? { createdAt: "desc" } : getOrderBy(sortFilter),
        });

        const sortedEmails = confidenceSort
            ? [...emails].sort((a, b) => {
                const diff = getConfidenceRank(a) - getConfidenceRank(b);
                return sortFilter === "confidence_asc" ? diff : -diff;
            })
            : emails;

        if (pagination.enabled) {
            const pagedEmails = sortedEmails.slice(
                pagination.offset,
                pagination.offset + pagination.limit
            );

            return NextResponse.json({
                emails: pagedEmails.map(mapEmailResponse),
                total: sortedEmails.length,
                limit: pagination.limit,
                offset: pagination.offset,
            });
        }

        return NextResponse.json(sortedEmails.map(mapEmailResponse));
    } catch (error) {
        console.error("READY TO SEND GET ERROR:", error);
        return NextResponse.json([], { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const user = authGuard(req);
    if (!user || typeof user !== "object" || !("id" in user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: ReadyToSendBody | null = await req.json().catch(() => null);
    if (!body) {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { emailId, subject, sender, saveOnly, sendNow } = body;
    const finalReply = pickFinalReply(body.manualReply, body.aiReply);

    try {
        if (saveOnly) {
            if (!emailId) {
                return NextResponse.json({ error: "emailId required for saveOnly" }, { status: 400 });
            }

            const existingEmail = await prisma.email.findFirst({
                where: { id: emailId, userId: user.id },
            });
            if (!existingEmail) {
                return NextResponse.json({ error: "Email not found" }, { status: 404 });
            }

            await prisma.email.update({
                where: { id: emailId },
                data: {
                    aiReply: body.aiReply !== undefined ? body.aiReply : existingEmail.aiReply,
                    manualReply: body.manualReply !== undefined ? body.manualReply : existingEmail.manualReply,
                },
            });

            return NextResponse.json({ success: true, saved: true });
        }

        if (sendNow) {
            if (!emailId) {
                return NextResponse.json({ error: "emailId required for sendNow" }, { status: 400 });
            }

            const existingEmail = await prisma.email.findFirst({
                where: { id: emailId, userId: user.id },
            });
            if (!existingEmail) {
                return NextResponse.json({ error: "Email not found" }, { status: 404 });
            }

            const targetEmail =
                typeof existingEmail.senderEmail === "string" && existingEmail.senderEmail.trim() !== ""
                    ? existingEmail.senderEmail.trim()
                    : (sender || "").trim();

            if (!isValidEmail(targetEmail)) {
                return NextResponse.json({ error: "Recipient email is missing or invalid" }, { status: 400 });
            }

            const replyForSend = finalReply || pickFinalReply(existingEmail.manualReply || "", existingEmail.aiReply || "");
            if (!replyForSend) {
                return NextResponse.json({ error: "Reply text cannot be empty" }, { status: 400 });
            }

            const sendResult = await sendAutoReplyDetailed(
                targetEmail,
                replyForSend,
                existingEmail.category || "general",
                user.id
            );

            if (!sendResult.success) {
                return NextResponse.json({ error: sendResult.error || "Email send failed" }, { status: 500 });
            }

            await prisma.email.update({
                where: { id: existingEmail.id },
                data: {
                    status: "sent",
                    tag: "sent",
                    readyToSend: false,
                    manualReply: body.manualReply ?? existingEmail.manualReply ?? replyForSend,
                    aiReply: body.aiReply ?? existingEmail.aiReply ?? replyForSend,
                    senderEmail: targetEmail,
                },
            });

            return NextResponse.json({ success: true, sent: true });
        }

        if (!subject || !sender) {
            return NextResponse.json({ error: "subject and sender are required" }, { status: 400 });
        }
        if (!finalReply) {
            return NextResponse.json({ error: "manualReply or aiReply is required" }, { status: 400 });
        }
        if (!isValidEmail(sender)) {
            return NextResponse.json({ error: "sender must be a valid email" }, { status: 400 });
        }

        const detectedCategory = await detectCategory((body.body ?? finalReply).trim(), user.id);

        if (emailId) {
            const existingEmail = await prisma.email.findFirst({
                where: { id: emailId, userId: user.id },
            });

            if (!existingEmail) {
                return NextResponse.json({ error: "Email not found" }, { status: 404 });
            }

            const updated = await prisma.email.update({
                where: { id: emailId },
                data: {
                    subject,
                    body: body.body ?? existingEmail.body,
                    senderEmail: sender,
                    aiReply: body.aiReply ?? existingEmail.aiReply ?? finalReply,
                    manualReply: body.manualReply ?? existingEmail.manualReply ?? finalReply,
                    category: detectedCategory,
                    status: "ready_send",
                    tag: "read",
                    readyToSend: true,
                    readyToSell: detectedCategory === "sales",
                },
            });

            return NextResponse.json({
                success: true,
                ready: true,
                emailId: updated.id,
                category: updated.category,
            });
        }

        const created = await prisma.email.create({
            data: {
                subject,
                body: body.body ?? "",
                senderEmail: sender,
                aiReply: body.aiReply ?? finalReply,
                manualReply: body.manualReply ?? finalReply,
                category: detectedCategory,
                status: "ready_send",
                tag: "read",
                readyToSend: true,
                readyToSell: detectedCategory === "sales",
                userId: user.id,
            },
        });

        return NextResponse.json({
            success: true,
            ready: true,
            emailId: created.id,
            category: created.category,
        });
    } catch (error) {
        console.error("READY TO SEND POST ERROR:", error);
        return NextResponse.json({ error: "Failed to process ready-to-send email" }, { status: 500 });
    }
}
