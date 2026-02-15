import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authGuard } from "@/lib/middleware/authMiddleware";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type CategoryFilter = "all" | "unread" | "ready" | "important" | "sent";
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
    const normalized = (value || "sent").toLowerCase();
    if (normalized === "all" || normalized === "unread" || normalized === "ready" || normalized === "important" || normalized === "sent") {
        return normalized;
    }
    return "sent";
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
    return { OR: [{ status: "sent" }, { tag: "sent" }] };
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

        const where: Prisma.EmailWhereInput = {
            userId: user.id,
            AND: [
                getCategoryWhere(categoryFilter),
                getConfidenceWhere(confidenceFilter),
                getDateWhere(dateFilter),
            ],
        };

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

        return NextResponse.json(
            sortedEmails.map((e) => ({
                id: e.id,
                subject: e.subject,
                sender: e.senderEmail ?? "unknown",
                body: e.body,
                aiReply: e.aiReply,
                confidence: getConfidenceLabel(getConfidenceRank(e)),
                accountId: e.accountId,
                createdAt: e.createdAt,
                tag: "sent" as const,
            }))
        );
    } catch (err) {
        console.error(err);
        return NextResponse.json([], { status: 500 });
    }
}
