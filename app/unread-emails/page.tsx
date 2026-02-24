"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Check, Sparkles } from "lucide-react";
import EmailItem from "@/components/email/EmailItem";
import EmailDetailModal, { EmailModalData } from "@/components/email/EmailDetailModal";
import Select from "@/components/ui/Select";
import Stat from "@/components/ui/Stat";
import PageHeader from "@/components/ui/Header";
import SuperLoading from "@/components/ui/SuperLoading";
import PaginationControls from "@/components/ui/PaginationControls";
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
    aiReply: string;
    manualReply: string;
    tag: "ready";
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
            <PageHeader
                title="Unread Emails"
                subtitle="New messages waiting for AI or manual reply"
                stats={[
                    { icon: Sparkles, label: "AI Recommended", value: "-", color: "text-primary" },
                    { icon: Check, label: "Pending Responses", value: total, color: "text-success" },
                ]}
            />

            <div className="border border-border bg-card rounded-xl p-3 flex flex-col gap-3">
                <div className="flex items-center gap-2 border border-border rounded-md px-3 py-2">
                    <Search size={16} className="text-muted" />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search subject, sender..."
                        className="bg-transparent outline-none text-sm w-full"
                    />
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                    <Select label="Category" value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />
                    <Select
                        label="AI Confidence"
                        value={confidence}
                        options={CONFIDENCE_OPTIONS}
                        onChange={setConfidence}
                    />
                    <Select label="Date" value={date} options={DATE_OPTIONS} onChange={setDate} />
                    <Select label="Sort" value={sort} options={SORT_OPTIONS} onChange={setSort} />
                </div>
            </div>

            <div className="flex flex-wrap gap-3 text-xs">
                <Stat label="Total Unread" value={total} color="text-success" />
                <Stat label="Page" value={totalPages === 0 ? 0 : currentPage} color="text-primary" />
            </div>

            <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto pe-1">
                {error && <p className="text-xs text-danger">{error}</p>}
                {!error && warning && <p className="text-xs text-warning">{warning}</p>}
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

            <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
            />

            <EmailDetailModal
                email={selectedEmail}
                onClose={() => setSelectedEmail(null)}
                onEdit={saveFromModal}
                onSend={sendFromModal}
            />
        </div>
    );
}
