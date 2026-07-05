"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Check, Sparkles, Mail, Filter, ChevronDown } from "lucide-react";
import EmailItem from "@/components/email/EmailItem";
import EmailDetailModal, { EmailModalData } from "@/components/email/EmailDetailModal";
import SuperLoading from "@/components/ui/SuperLoading";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { filterEmailsByQuery } from "@/lib/utils/filterEmails";

interface Email extends EmailModalData {
    tag?: "unread";
}

interface UnreadEmailsApiResponse {
    emails: Email[];
    total: number;
    warning?: string;
}

interface ReadyEmailResponse {
    id: string;
    subject: string;
    sender: string;
    body: string;
    bodyHtml?: string;
    aiReply: string;
    manualReply: string;
    tag: "ready";
}

const CATEGORY_OPTIONS = [
    { label: "All Categories", value: "all" },
    { label: "Unread", value: "unread" },
    { label: "Ready", value: "ready" },
    { label: "Important", value: "important" },
    { label: "Sent", value: "sent" },
];

const CONFIDENCE_OPTIONS = [
    { label: "All Confidence", value: "all" },
    { label: "High", value: "high" },
    { label: "Medium", value: "medium" },
    { label: "Low", value: "low" },
];

const DATE_OPTIONS = [
    { label: "All Time", value: "all" },
    { label: "Today", value: "today" },
    { label: "Last 7 Days", value: "7d" },
    { label: "Last 30 Days", value: "30d" },
    { label: "Last 90 Days", value: "90d" },
];

const SORT_OPTIONS = [
    { label: "Newest First", value: "newest" },
    { label: "Oldest First", value: "oldest" },
    { label: "Subject A-Z", value: "subject_asc" },
    { label: "Subject Z-A", value: "subject_desc" },
    { label: "Sender A-Z", value: "sender_asc" },
    { label: "Sender Z-A", value: "sender_desc" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function UnreadEmailsPage() {
    const [emails, setEmails] = useState<Email[]>([]);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [category, setCategory] = useState("unread");
    const [confidence, setConfidence] = useState("all");
    const [date, setDate] = useState("all");
    const [sort, setSort] = useState("newest");
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        const fetchEmails = async () => {
            const offset = (currentPage - 1) * pageSize;
            try {
                setLoading(true);
                setError(null);
                const params = new URLSearchParams({
                    limit: String(pageSize),
                    offset: String(offset),
                    category,
                    confidence,
                    date,
                    sort,
                });
                const res = await fetch(`/api/unread-emails?${params.toString()}`, {
                    credentials: "include",
                    cache: "no-store",
                    signal: controller.signal,
                });
                const data: UnreadEmailsApiResponse = await res.json();
                if (!res.ok) {
                    throw new Error("Failed to fetch unread emails");
                }
                setEmails(Array.isArray(data.emails) ? data.emails : []);
                setTotal(Number.isFinite(data.total) ? data.total : 0);
                setWarning(typeof data.warning === "string" ? data.warning : null);
            } catch (fetchError) {
                if ((fetchError as Error).name === "AbortError") return;
                console.error("Failed to fetch unread emails:", fetchError);
                setError("Could not load unread emails.");
                setWarning(null);
                setEmails([]);
                setTotal(0);
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchEmails();
        return () => controller.abort();
    }, [currentPage, category, confidence, date, sort, pageSize]);

    useEffect(() => {
        setCurrentPage(1);
    }, [category, confidence, date, sort, pageSize]);

    const debouncedSearch = useDebouncedValue(search, 250);
    const filteredEmails = useMemo(
        () => filterEmailsByQuery(emails, debouncedSearch),
        [emails, debouncedSearch]
    );

    const totalPages = Math.ceil(total / pageSize);

    useEffect(() => {
        if (totalPages === 0 && currentPage !== 1) {
            setCurrentPage(1);
            return;
        }

        if (totalPages > 0 && currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const removeEmailFromList = (id: string) => {
        setEmails((prev) => prev.filter((email) => email.id !== id));
        setTotal((prev) => Math.max(0, prev - 1));
        setSelectedEmail((prev) => (prev && prev.id === id ? null : prev));
    };

    const ensureReplyText = async (email: EmailModalData, replyText: string): Promise<string> => {
        const normalized = replyText.trim();
        if (normalized) return normalized;

        const aiRes = await fetch("/api/ai-analyze-lead", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ category: "support", message: email.body || "" }),
        });
        const aiData = await aiRes.json().catch(() => null);
        if (!aiRes.ok) {
            throw new Error(aiData?.error || "Could not generate AI reply");
        }
        const generated = String(aiData?.reply || "").trim();
        if (!generated) {
            throw new Error("Reply text cannot be empty");
        }
        return generated;
    };

    const approveUnreadEmail = async (email: EmailModalData, replyText: string): Promise<ReadyEmailResponse> => {
        const approveRes = await fetch("/api/unread-emails", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                emailId: email.id,
                subject: email.subject,
                sender: email.sender,
                body: email.body || "",
                bodyHtml: email.bodyHtml || "",
                text: replyText,
            }),
        });
        const approveData = await approveRes.json().catch(() => null);
        if (!approveRes.ok || !approveData?.readyEmail) {
            throw new Error(approveData?.error || "Failed to approve email");
        }
        return approveData.readyEmail as ReadyEmailResponse;
    };

    const saveFromModal = async (email: EmailModalData, replyText: string) => {
        const finalReply = await ensureReplyText(email, replyText);
        await approveUnreadEmail(email, finalReply);
        removeEmailFromList(email.id);
    };

    const sendFromModal = async (email: EmailModalData, replyText: string) => {
        const finalReply = await ensureReplyText(email, replyText);
        const readyEmail = await approveUnreadEmail(email, finalReply);

        const sendRes = await fetch("/api/ready-to-send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                emailId: readyEmail.id,
                subject: readyEmail.subject,
                sender: readyEmail.sender,
                body: readyEmail.body,
                manualReply: finalReply,
                sendNow: true,
            }),
        });
        const sendData = await sendRes.json().catch(() => null);
        if (!sendRes.ok) {
            throw new Error(sendData?.error || "Failed to send email");
        }

        removeEmailFromList(email.id);
    };

    if (loading) {
        return <SuperLoading variant="list" label="Loading unread emails" />;
    }

    return (
        <div className="flex h-full min-w-0 flex-col gap-4 overflow-auto">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-text">Unread Emails</h1>
                    <p className="mt-1 text-sm text-muted">New messages waiting for AI or manual reply</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard icon={Mail} label="Total" value={total} accent="tag-unread" />
                <StatCard icon={Sparkles} label="On Page" value={filteredEmails.length} accent="primary" />
                <StatCard icon={Check} label="Page" value={`${currentPage} / ${totalPages || 1}`} accent="tag-sent" />
                <StatCard icon={Filter} label="Showing" value={pageSize} accent="tag-important" />
            </div>

            {/* Error/Warning */}
            {error && (
                <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                    {error}
                </div>
            )}
            {!error && warning && (
                <div className="rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 text-sm text-warning">
                    {warning}
                </div>
            )}

            {/* Search & Filters */}
            <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                    <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-bg/50 px-3 py-2.5 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                        <Search size={16} className="text-muted" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search by subject or sender..."
                            className="bg-transparent text-sm text-text placeholder:text-muted/50 outline-none w-full"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                            showFilters
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border text-muted hover:border-primary/30 hover:text-text"
                        }`}
                    >
                        <Filter size={14} />
                        Filters
                        <ChevronDown size={14} className={`transition ${showFilters ? "rotate-180" : ""}`} />
                    </button>
                </div>

                {showFilters && (
                    <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-3">
                        <FilterSelect label="Category" value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />
                        <FilterSelect label="Confidence" value={confidence} options={CONFIDENCE_OPTIONS} onChange={setConfidence} />
                        <FilterSelect label="Date" value={date} options={DATE_OPTIONS} onChange={setDate} />
                        <FilterSelect label="Sort" value={sort} options={SORT_OPTIONS} onChange={setSort} />
                        <FilterSelect label="Per Page" value={String(pageSize)} options={PAGE_SIZE_OPTIONS.map(s => ({ label: String(s), value: String(s) }))} onChange={(v) => setPageSize(Number(v))} />
                    </div>
                )}
            </div>

            {/* Email List */}
            <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto pe-1">
                {filteredEmails.length > 0 ? (
                    <div className="flex flex-col gap-2">
                        {filteredEmails.map((email) => (
                            <EmailItem
                                key={email.id}
                                id={email.id}
                                subject={email.subject || "No Subject"}
                                sender={email.sender || "unknown"}
                                body={email.body || ""}
                                bodyHtml={email.bodyHtml || ""}
                                aiReply={email.aiReply || ""}
                                manualReply={email.manualReply || ""}
                                tag="unread"
                                onSelect={() => setSelectedEmail(email)}
                                onRemoveEmail={removeEmailFromList}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-muted">
                        <Mail size={40} className="opacity-30" />
                        <p className="text-sm">No unread emails found</p>
                        {(search || category !== "unread" || confidence !== "all" || date !== "all") && (
                            <button
                                onClick={() => {
                                    setSearch("");
                                    setCategory("unread");
                                    setConfidence("all");
                                    setDate("all");
                                    setSort("newest");
                                }}
                                className="text-xs text-primary hover:underline"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                    <span className="text-xs text-muted">
                        Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, total)} of {total}
                    </span>
                    <div className="flex items-center gap-1">
                        <PaginationBtn
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage <= 1}
                        >
                            Prev
                        </PaginationBtn>
                        {getVisiblePages(currentPage, totalPages).map((page, index, arr) => {
                            const prev = arr[index - 1];
                            const showGap = prev !== undefined && page - prev > 1;
                            return (
                                <span key={page} className="flex items-center gap-1">
                                    {showGap && <span className="px-1 text-xs text-muted">...</span>}
                                    <PaginationBtn
                                        active={page === currentPage}
                                        onClick={() => setCurrentPage(page)}
                                    >
                                        {page}
                                    </PaginationBtn>
                                </span>
                            );
                        })}
                        <PaginationBtn
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage >= totalPages}
                        >
                            Next
                        </PaginationBtn>
                    </div>
                </div>
            )}

            <EmailDetailModal
                email={selectedEmail}
                onClose={() => setSelectedEmail(null)}
                onEdit={saveFromModal}
                onSend={sendFromModal}
            />
        </div>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
    accent,
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    value: number | string;
    accent: string;
}) {
    const colorMap: Record<string, string> = {
        primary: "bg-primary/10 text-primary",
        "tag-unread": "bg-tag-unread/10 text-tag-unread",
        "tag-sent": "bg-tag-sent/10 text-tag-sent",
        "tag-important": "bg-tag-important/10 text-tag-important",
    };

    return (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-primary/30">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colorMap[accent] || "bg-primary/10 text-primary"}`}>
                <Icon size={18} />
            </div>
            <div className="min-w-0">
                <p className="text-xl font-bold text-text">{value}</p>
                <p className="text-xs text-muted">{label}</p>
            </div>
        </div>
    );
}

function FilterSelect({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: { label: string; value: string }[];
    onChange: (value: string) => void;
}) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-muted">{label}</label>
            <select
                className="rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 min-w-[140px]"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

function PaginationBtn({
    children,
    active,
    disabled,
    onClick,
}: {
    children: React.ReactNode;
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                active
                    ? "bg-primary text-white shadow-sm"
                    : "border border-border text-muted hover:border-primary/30 hover:text-text"
            }`}
        >
            {children}
        </button>
    );
}

function getVisiblePages(current: number, total: number): number[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    const pages = new Set([1, total]);
    for (let p = start; p <= end; p++) pages.add(p);
    return Array.from(pages).sort((a, b) => a - b);
}
