import { NextRequest, NextResponse } from "next/server";
import { readUnreadEmailsPaginated, Email, markEmailAsSeenByUid } from "@/lib/services/readEmail";
import prisma from "@/lib/prisma";
import { authGuard } from "@/lib/middleware/authMiddleware";
import { detectCategory } from "@/lib/services/classifier";
import { getUserAutomationSettings } from "@/lib/services/userSettings";
import { autoPrepareUnreadEmails, autoSendPendingReadyEmails } from "@/lib/services/automation";

export const dynamic = "force-dynamic";

interface UnreadEmailResponse {
    id: string;
    subject: string;
    sender: string;
    body: string;
    bodyHtml?: string;
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
    warning?: string;
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
const UNREAD_AUTOMATION_COOLDOWN_MS = 30_000;
const UNREAD_AUTOMATION_BATCH_LIMIT = 20;
const READY_AUTOSEND_COOLDOWN_MS = 30_000;
const UNREAD_AUTOMATION_WARNING_TTL_MS = 60_000;
const unreadCache = new Map<string, { expiresAt: number; payload: UnreadEmailsGetResponse }>();
const unreadAutomationInFlight = new Set<string>();
const unreadAutomationLastRun = new Map<string, number>();
const unreadAutomationWarnings = new Map<string, { message: string; expiresAt: number }>();
const readyAutoSendInFlight = new Set<string>();
const readyAutoSendLastRun = new Map<string, number>();

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

function canRunUnreadAutomation(userId: string): boolean {
    if (unreadAutomationInFlight.has(userId)) {
        return false;
    }

    const now = Date.now();
    const lastRun = unreadAutomationLastRun.get(userId) ?? 0;
    return now - lastRun >= UNREAD_AUTOMATION_COOLDOWN_MS;
}

function runUnreadAutomationInBackground(
    userId: string,
    unreadEmails: Email[],
    autoSendReadyEmails: boolean
): void {
    if (!canRunUnreadAutomation(userId)) {
        return;
    }

    const batch = unreadEmails.slice(0, UNREAD_AUTOMATION_BATCH_LIMIT);
    if (batch.length === 0) {
        return;
    }

    unreadAutomationInFlight.add(userId);

    void autoPrepareUnreadEmails(userId, batch, { autoSendReadyEmails })
        .then((automationResult) => {
            const warningMessage = automationResult.errors.some((message) =>
                message.includes("Daily AI request limit has been reached.")
            )
                ? "Daily AI request limit has been reached."
                : automationResult.errors.some((message) =>
                    message.includes("No response received from AI.")
                )
                    ? "No response received from AI. Unread emails were not marked as read."
                    : undefined;
            if (warningMessage) {
                unreadAutomationWarnings.set(userId, {
                    message: warningMessage,
                    expiresAt: Date.now() + UNREAD_AUTOMATION_WARNING_TTL_MS,
                });
                unreadCache.clear();
            } else {
                unreadAutomationWarnings.delete(userId);
            }

            if (
                automationResult.preparedCount > 0 ||
                automationResult.sentCount > 0
            ) {
                unreadCache.clear();
            }

            if (automationResult.errors.length > 0) {
                console.warn("Unread auto-processing warnings:", automationResult.errors);
            }
        })
        .catch((error) => {
            console.error("Unread auto-processing failed:", error);
        })
        .finally(() => {
            unreadAutomationInFlight.delete(userId);
            unreadAutomationLastRun.set(userId, Date.now());
        });
}

function getUnreadAutomationWarning(userId: string): string | undefined {
    const current = unreadAutomationWarnings.get(userId);
    if (!current) return undefined;
    if (current.expiresAt <= Date.now()) {
        unreadAutomationWarnings.delete(userId);
        return undefined;
    }
    return current.message;
}

function canRunReadyAutoSend(userId: string): boolean {
    if (readyAutoSendInFlight.has(userId)) {
        return false;
    }

    const now = Date.now();
    const lastRun = readyAutoSendLastRun.get(userId) ?? 0;
    return now - lastRun >= READY_AUTOSEND_COOLDOWN_MS;
}

function runReadyAutoSendInBackground(userId: string): void {
    if (!canRunReadyAutoSend(userId)) {
        return;
    }

    readyAutoSendInFlight.add(userId);

    void autoSendPendingReadyEmails(userId)
        .then((result) => {
            if (result.sentCount > 0) {
                unreadCache.clear();
            }
            if (result.errors.length > 0) {
                console.warn("Ready auto-send warnings:", result.errors);
            }
        })
        .catch((error) => {
            console.error("Ready auto-send failed:", error);
        })
        .finally(() => {
            readyAutoSendInFlight.delete(userId);
            readyAutoSendLastRun.set(userId, Date.now());
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
        const automationSettings =
            effectiveOffset === 0
                ? await getUserAutomationSettings(String(user.id))
                : { autoApproveUnread: false, autoSendReadyEmails: false };
        const shouldAutoProcessUnread =
            effectiveOffset === 0 && automationSettings.autoApproveUnread;
        const shouldAutoSendReady =
            effectiveOffset === 0 && automationSettings.autoSendReadyEmails;

        if (shouldAutoSendReady) {
            runReadyAutoSendInBackground(String(user.id));
        }

        const cacheKey = `${user.id}:${limit}:${effectiveOffset}:${categoryFilter}:${confidenceFilter}:${dateFilter}:${sortFilter}`;
        const now = Date.now();
        const cached = unreadCache.get(cacheKey);
        if (cached && cached.expiresAt > now) {
            const cachedWarning = getUnreadAutomationWarning(String(user.id));
            return NextResponse.json<UnreadEmailsGetResponse>(
                {
                    ...cached.payload,
                    warning: cachedWarning || cached.payload.warning,
                },
                { status: 200 }
            );
        }

        const shouldFetchAllUnread = requiresGlobalFiltering;

        const unread = await withTimeout(
            readUnreadEmailsPaginated(
                shouldFetchAllUnread ? Number.MAX_SAFE_INTEGER : limit,
                shouldFetchAllUnread ? 0 : effectiveOffset,
                user.id
            ),
            UNREAD_FETCH_TIMEOUT_MS
        );

        if (shouldAutoProcessUnread && unread.emails.length > 0) {
            runUnreadAutomationInBackground(
                String(user.id),
                unread.emails,
                automationSettings.autoSendReadyEmails
            );
        }

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
            bodyHtml: e.html ?? "",
            aiReply: "",
            manualReply: "",
            status: "unread",
            tag: "unread",
            category: "general",
            createdAt: (e.date ?? new Date()).toISOString(),
        }));

        const payload: UnreadEmailsGetResponse = {
            emails: formatted,
            total: totalFiltered,
            warning: getUnreadAutomationWarning(String(user.id)),
        };
        unreadCache.set(cacheKey, { expiresAt: now + CACHE_TTL_MS, payload });

        return NextResponse.json<UnreadEmailsGetResponse>(payload, { status: 200 });
    } catch (err) {
        console.error("UNREAD EMAILS ERROR:", err);

        const limitParam = req.nextUrl.searchParams.get("limit") ?? "50";
        const offsetParam = req.nextUrl.searchParams.get("offset") ?? "0";
        const categoryFilter = normalizeCategoryFilter(req.nextUrl.searchParams.get("category"));
        const confidenceFilter = normalizeConfidenceFilter(req.nextUrl.searchParams.get("confidence"));
        const dateFilter = normalizeDateFilter(req.nextUrl.searchParams.get("date"));
        const sortFilter = normalizeSortFilter(req.nextUrl.searchParams.get("sort"));
        const fallbackCacheKey = `${user.id}:${limitParam}:${offsetParam}:${categoryFilter}:${confidenceFilter}:${dateFilter}:${sortFilter}`;
        const stale = unreadCache.get(fallbackCacheKey);

        if (stale) {
            const staleWarning = getUnreadAutomationWarning(String(user.id));
            return NextResponse.json<UnreadEmailsGetResponse>(
                {
                    ...stale.payload,
                    warning: staleWarning || stale.payload.warning,
                },
                {
                    status: 200,
                    headers: staleWarning
                        ? { "x-cache": "stale", "x-unread-warning": staleWarning }
                        : { "x-cache": "stale" },
                }
            );
        }

        const fallbackWarning = getUnreadAutomationWarning(String(user.id));
        return NextResponse.json<UnreadEmailsGetResponse>(
            { emails: [], total: 0, warning: fallbackWarning },
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

            await markEmailAsSeenByUid(uid, user.id);
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

        await markEmailAsSeenByUid(uid, user.id);
        unreadCache.clear();

        const detectedCategory = await detectCategory((body.body || finalReply).trim(), user.id);

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
