"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Check, Sparkles } from "lucide-react";
import EmailItem from "@/components/email/EmailItem";
import Select from "@/components/ui/Select";
import Stat from "@/components/ui/Stat";
import PageHeader from "@/components/ui/Header";
import SuperLoading from "@/components/ui/SuperLoading";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { filterEmailsByQuery } from "@/lib/utils/filterEmails";

interface Email {
    id: string;
    subject: string;
    sender: string;
    body?: string;
    aiReply?: string;
    manualReply?: string;
    tag?: "unread";
}

interface UnreadEmailsApiResponse {
    emails: Email[];
    total: number;
}

const CATEGORY_OPTIONS = [
    { label: "Unread", value: "unread" },
    { label: "Ready", value: "ready" },
    { label: "Important", value: "important" },
    { label: "Sent", value: "sent" },
    { label: "All", value: "all" },
];

const CONFIDENCE_OPTIONS = [
    { label: "All", value: "all" },
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
    { label: "Newest", value: "newest" },
    { label: "Oldest", value: "oldest" },
    { label: "Subject A-Z", value: "subject_asc" },
    { label: "Subject Z-A", value: "subject_desc" },
    { label: "Sender A-Z", value: "sender_asc" },
    { label: "Sender Z-A", value: "sender_desc" },
    { label: "Confidence High-Low", value: "confidence_desc" },
    { label: "Confidence Low-High", value: "confidence_asc" },
];

export default function UnreadEmailsPage() {
    const [emails, setEmails] = useState<Email[]>([]);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [category, setCategory] = useState("unread");
    const [confidence, setConfidence] = useState("all");
    const [date, setDate] = useState("all");
    const [sort, setSort] = useState("newest");
    const PER_PAGE = 50;

    // ایمیل انتخاب‌شده برای نمایش مودال
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        const fetchEmails = async () => {
            const offset = (currentPage - 1) * PER_PAGE;
            try {
                setLoading(true);
                setError(null);
                const params = new URLSearchParams({
                    limit: String(PER_PAGE),
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
            } catch (err) {
                if ((err as Error).name === "AbortError") return;
                console.error("Failed to fetch unread emails:", err);
                setError("Could not load unread emails.");
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
    }, [currentPage, category, confidence, date, sort]);

    const debouncedSearch = useDebouncedValue(search, 250);
    const filteredEmails = useMemo(
        () => filterEmailsByQuery(emails, debouncedSearch),
        [emails, debouncedSearch]
    );

    const totalPages = Math.ceil(total / PER_PAGE);
    const pageNumbers = useMemo(
        () => Array.from({ length: totalPages }, (_, idx) => idx + 1),
        [totalPages]
    );

    const removeEmailFromList = (id: string) => {
        setEmails((prev) => prev.filter((email) => email.id !== id));
        setTotal((prev) => Math.max(0, prev - 1));
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [category, confidence, date, sort]);

    useEffect(() => {
        if (totalPages === 0 && currentPage !== 1) {
            setCurrentPage(1);
            return;
        }

        if (totalPages > 0 && currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    if (loading) {
        return <SuperLoading variant="list" label="Loading unread emails" />;
    }

    return (
        <div className="h-full flex flex-col gap-4 overflow-auto">
            <PageHeader
                title="Unread Emails"
                subtitle="New messages waiting for AI or manual reply"
                stats={[
                    { icon: Sparkles, label: "AI Recommended", value: "–", color: "text-primary" },
                    { icon: Check, label: "Pending Responses", value: total, color: "text-success" },
                ]}
            />

            {/* FILTER PANEL */}
            <div className="border border-border rounded-xl p-3 flex flex-col gap-3">
                <div className="flex items-center gap-2 border border-border rounded-md px-3 py-2">
                    <Search size={16} className="text-muted" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search subject, sender..."
                        className="bg-transparent outline-none text-sm w-full"
                    />
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                    <Select label="Category" value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />
                    <Select label="AI Confidence" value={confidence} options={CONFIDENCE_OPTIONS} onChange={setConfidence} />
                    <Select label="Date" value={date} options={DATE_OPTIONS} onChange={setDate} />
                    <Select label="Sort" value={sort} options={SORT_OPTIONS} onChange={setSort} />
                </div>
            </div>

            {/* QUICK STATS */}
            <div className="flex gap-3 text-xs">
                <Stat label="Total Unread" value={total} color="text-success" />
                <Stat label="Page" value={totalPages === 0 ? 0 : currentPage} color="text-primary" />
            </div>

            {/* LIST */}
            <div className="flex-1 overflow-y-auto pe-1 scrollbar-thin flex flex-col gap-2">
                {error && <p className="text-xs text-danger">{error}</p>}
                {filteredEmails.map((email) => (
                    <EmailItem
                        key={email.id}
                        id={email.id}
                        subject={email.subject || "No Subject"}
                        sender={email.sender || "unknown"}
                        body={email.body || ""}
                        aiReply={email.aiReply || ""}
                        manualReply={email.manualReply || ""}
                        tag="unread"
                        onSelect={() => setSelectedEmail(email)}
                        onRemoveEmail={removeEmailFromList}
                    />
                ))}
                {!error && filteredEmails.length === 0 && (
                    <p className="text-xs text-muted">No unread emails</p>
                )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                    className="px-3 py-1 text-xs border border-border rounded-md disabled:opacity-50"
                >
                    Prev
                </button>

                <div className="flex flex-wrap gap-1">
                    {pageNumbers.map((pageNumber) => (
                        <button
                            key={pageNumber}
                            onClick={() => setCurrentPage(pageNumber)}
                            className={`px-2 py-1 text-xs rounded-md border ${pageNumber === currentPage ? "border-primary text-primary" : "border-border text-muted"
                                }`}
                        >
                            {pageNumber}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages || 1, prev + 1))}
                    disabled={totalPages === 0 || currentPage >= totalPages}
                    className="px-3 py-1 text-xs border border-border rounded-md disabled:opacity-50"
                >
                    Next
                </button>
            </div>

            {/* FULL PAGE MODAL */}
            {selectedEmail && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-bg w-full h-full max-w-5xl max-h-[90vh] overflow-auto p-6 rounded-xl">
                        <h3 className="font-semibold mb-4 text-lg">{selectedEmail.subject}</h3>
                        <p className="text-sm text-muted whitespace-pre-line">
                            {selectedEmail.body || "No content"}
                        </p>
                        {selectedEmail.aiReply && (
                            <div className="mt-4 border-t pt-2">
                                <p className="font-semibold text-sm">AI Reply:</p>
                                <p className="text-sm text-muted whitespace-pre-line">
                                    {selectedEmail.aiReply}
                                </p>
                            </div>
                        )}
                        {selectedEmail.manualReply && (
                            <div className="mt-2 border-t pt-2">
                                <p className="font-semibold text-sm">Manual Reply:</p>
                                <p className="text-sm text-muted whitespace-pre-line">
                                    {selectedEmail.manualReply}
                                </p>
                            </div>
                        )}
                        <button
                            onClick={() => setSelectedEmail(null)}
                            className="mt-4 px-4 py-2 text-sm border border-border rounded-md hover:border-primary"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
