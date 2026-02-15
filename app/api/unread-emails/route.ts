import { NextRequest, NextResponse } from "next/server";
import { readUnreadEmailsPaginated, Email, markEmailAsSeenByUid } from "@/lib/services/readEmail";
import prisma from "@/lib/prisma";
import { authGuard } from "@/lib/middleware/authMiddleware";
import { detectCategory } from "@/lib/services/classifier";

export const dynamic = "force-dynamic";

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

const CACHE_TTL_MS = 5_000;
const UNREAD_FETCH_TIMEOUT_MS = 12_000;
const unreadCache = new Map<string, { expiresAt: number; payload: UnreadEmailsGetResponse }>();

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
    const normalized = (value || "unread").toLowerCase();
    if (normalized === "all" || normalized === "unread" || normalized === "ready" || normalized === "important" || normalized === "sent") {
        return normalized;
    }
    return "unread";
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

function getConfidenceRank(email: Email): number {
    void email;
    return 1;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error(`Unread fetch timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        promise
            .then((value) => {
                clearTimeout(timeoutId);
                resolve(value);
            })
            .catch((error) => {
                clearTimeout(timeoutId);
                reject(error);
            });
    });
}

export async function GET(req: NextRequest) {
    const user = authGuard(req);
    if (!user || typeof user !== "object" || !("id" in user)) {
        return NextResponse.json<UnreadEmailsGetResponse>(
            { emails: [], total: 0 },
            { status: 401 }
        );
    }

    try {
        const limitParam = req.nextUrl.searchParams.get("limit");
        const offsetParam = req.nextUrl.searchParams.get("offset");
        const hasOffsetParam = req.nextUrl.searchParams.has("offset");
        const parsedLimit = Number.parseInt(limitParam ?? "50", 10);
        const parsedOffset = Number.parseInt(offsetParam ?? "0", 10);
        const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50;
        const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
        const effectiveOffset = hasOffsetParam ? offset : 0;
        const categoryFilter = normalizeCategoryFilter(req.nextUrl.searchParams.get("category"));
        const confidenceFilter = normalizeConfidenceFilter(req.nextUrl.searchParams.get("confidence"));
        const dateFilter = normalizeDateFilter(req.nextUrl.searchParams.get("date"));
        const sortFilter = normalizeSortFilter(req.nextUrl.searchParams.get("sort"));
        const requiresGlobalFiltering =
            categoryFilter !== "unread" ||
            confidenceFilter !== "all" ||
            dateFilter !== "all" ||
            sortFilter !== "newest";
        const skipCache = effectiveOffset === 0;

        const cacheKey = `${user.id}:${limit}:${effectiveOffset}:${categoryFilter}:${confidenceFilter}:${dateFilter}:${sortFilter}`;
        const now = Date.now();
        const cached = unreadCache.get(cacheKey);
        if (!skipCache && cached && cached.expiresAt > now) {
            return NextResponse.json<UnreadEmailsGetResponse>(cached.payload, { status: 200 });
        }

        const unread = await withTimeout(
            readUnreadEmailsPaginated(
                requiresGlobalFiltering ? Number.MAX_SAFE_INTEGER : limit,
                requiresGlobalFiltering ? 0 : effectiveOffset
            ),
            UNREAD_FETCH_TIMEOUT_MS
        );

        let filteredEmails = [...unread.emails];

        if (categoryFilter !== "all" && categoryFilter !== "unread") {
            filteredEmails = [];
        }

        if (confidenceFilter !== "all") {
            filteredEmails = filteredEmails.filter((email) => {
                const rank = getConfidenceRank(email);
                if (confidenceFilter === "high") return rank >= 3;
                if (confidenceFilter === "medium") return rank === 2;
                return rank === 1;
            });
        }

        if (dateFilter !== "all") {
            const nowDate = new Date();
            let fromDate: Date;

            if (dateFilter === "today") {
                fromDate = new Date(nowDate);
                fromDate.setHours(0, 0, 0, 0);
            } else {
                const days = dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : 90;
                fromDate = new Date(nowDate.getTime() - days * 24 * 60 * 60 * 1000);
            }

            filteredEmails = filteredEmails.filter((email) => {
                const emailTime = email.date?.getTime();
                if (!emailTime) return false;
                return emailTime >= fromDate.getTime();
            });
        }

        filteredEmails.sort((a, b) => {
            if (sortFilter === "oldest") {
                const left = a.date?.getTime() ?? 0;
                const right = b.date?.getTime() ?? 0;
                return left - right;
            }
            if (sortFilter === "subject_asc") return (a.subject || "").localeCompare(b.subject || "");
            if (sortFilter === "subject_desc") return (b.subject || "").localeCompare(a.subject || "");
            if (sortFilter === "sender_asc") return (a.from || "").localeCompare(b.from || "");
            if (sortFilter === "sender_desc") return (b.from || "").localeCompare(a.from || "");
            if (sortFilter === "confidence_asc") return getConfidenceRank(a) - getConfidenceRank(b);
            if (sortFilter === "confidence_desc") return getConfidenceRank(b) - getConfidenceRank(a);

            const left = a.date?.getTime() ?? 0;
            const right = b.date?.getTime() ?? 0;
            if (right !== left) return right - left;
            return b.uid - a.uid;
        });

        const totalFiltered = filteredEmails.length;
        const pageUnreadEmails = requiresGlobalFiltering
            ? filteredEmails.slice(effectiveOffset, effectiveOffset + limit)
            : filteredEmails;

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
            createdAt: (e.date ?? new Date()).toISOString(),
        }));

        const payload: UnreadEmailsGetResponse = { emails: formatted, total: totalFiltered };
        if (!skipCache) {
            unreadCache.set(cacheKey, { expiresAt: now + CACHE_TTL_MS, payload });
        }

        return NextResponse.json<UnreadEmailsGetResponse>(payload, { status: 200 });
    } catch (err) {
        console.error("UNREAD EMAILS ERROR:", err);

        const limitParam = req.nextUrl.searchParams.get("limit") ?? "50";
        const offsetParam = req.nextUrl.searchParams.get("offset") ?? "0";
        const categoryFilter = normalizeCategoryFilter(req.nextUrl.searchParams.get("category"));
        const confidenceFilter = normalizeConfidenceFilter(req.nextUrl.searchParams.get("confidence"));
        const dateFilter = normalizeDateFilter(req.nextUrl.searchParams.get("date"));
        const sortFilter = normalizeSortFilter(req.nextUrl.searchParams.get("sort"));
        const effectiveOffset = Number.parseInt(offsetParam, 10) || 0;
        const skipCache = effectiveOffset === 0;
        const fallbackCacheKey = `${user.id}:${limitParam}:${offsetParam}:${categoryFilter}:${confidenceFilter}:${dateFilter}:${sortFilter}`;
        const stale = unreadCache.get(fallbackCacheKey);

        if (!skipCache && stale) {
            return NextResponse.json<UnreadEmailsGetResponse>(stale.payload, {
                status: 200,
                headers: { "x-cache": "stale" },
            });
        }

        return NextResponse.json<UnreadEmailsGetResponse>(
            { emails: [], total: 0 },
            { status: 200 }
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

        if (!body.subject || !body.sender) {
            return NextResponse.json(
                { error: "subject and sender required" },
                { status: 400 }
            );
        }

        const finalReply = (body.text || "").trim();
        if (!finalReply) {
            return NextResponse.json(
                { error: "Reply text is required" },
                { status: 400 }
            );
        }

        const uid = Number.parseInt(body.emailId ?? "", 10);
        if (!Number.isFinite(uid) || uid <= 0) {
            return NextResponse.json({ error: "Valid emailId is required for approve" }, { status: 400 });
        }

        await markEmailAsSeenByUid(uid);
        unreadCache.clear();

        const detectedCategory = await detectCategory((body.body || finalReply).trim());

        const emailData = {
            subject: body.subject,
            body: body.body ?? "",
            aiReply: finalReply,
            manualReply: finalReply,
            category: detectedCategory,
            tag: "read",
            status: "ready_send",
            readyToSend: true,
            readyToSell: detectedCategory === "sales",
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
