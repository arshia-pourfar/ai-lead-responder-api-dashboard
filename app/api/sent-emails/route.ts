import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authGuard } from "@/lib/middleware/authMiddleware";
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
    const normalized = (value || "sent").trim().toLowerCase();
    return normalized || "sent";
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
    if (category === "ready") return { OR: [{ readyToSend: true }, { status: "ready_send" }] };
    if (category === "important") {
        return {
            OR: [{ readyToSell: true }, { tag: "important" }, { category: "sales" }],
        };
    }
    if (category === "sent") return { OR: [{ status: "sent" }, { tag: "sent" }] };
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
    senderEmail: string | null;
    body: string;
    bodyHtml: string | null;
    aiReply: string | null;
    manualReply: string | null;
    category: string;
    readyToSell: boolean;
    accountId: string | null;
    createdAt: Date;
}): {
    id: string;
    subject: string;
    sender: string;
    body: string;
    bodyHtml: string | null;
    aiReply: string | null;
    manualReply: string | null;
    confidence: "high" | "medium" | "low";
    accountId: string | null;
    createdAt: Date;
    tag: "sent";
} {
    return {
        id: email.id,
        subject: email.subject,
        sender: email.senderEmail ?? "unknown",
        body: email.body,
        bodyHtml: email.bodyHtml,
        aiReply: email.aiReply,
        manualReply: email.manualReply,
        confidence: getConfidenceLabel(getConfidenceRank(email)),
        accountId: email.accountId,
        createdAt: email.createdAt,
        tag: "sent",
    };
}

function isDatabaseConnectivityError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const message = error.message.toLowerCase();
    return (
        message.includes("can't reach database server") ||
        message.includes("prismaclientinitializationerror") ||
        message.includes("p1001") ||
        message.includes("timed out")
    );
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
                    include: { account: true },
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
            include: { account: true },
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
    } catch (err) {
        console.error(err);
        if (isDatabaseConnectivityError(err)) {
            return NextResponse.json([], { status: 200 });
        }
        return NextResponse.json([], { status: 500 });
    }
}
