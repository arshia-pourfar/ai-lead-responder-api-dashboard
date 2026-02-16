"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, CheckCheck, Sparkles } from "lucide-react";
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
    tag?: "sent";
    category?: string;
    confidence?: "high" | "medium" | "low";
}

interface PaginatedEmailsResponse {
    emails: Email[];
    total: number;
}

interface SettingsPayload {
    customCategories: string[];
}

const BASE_CATEGORY_OPTIONS = [
    { label: "Sent", value: "sent" },
    { label: "Ready", value: "ready" },
    { label: "Unread", value: "unread" },
    { label: "Important", value: "important" },
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

function toTitleCase(value: string): string {
    return value
        .split(" ")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

export default function SentEmailsPage() {
    const [emails, setEmails] = useState<Email[]>([]);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [category, setCategory] = useState("sent");
    const [confidence, setConfidence] = useState("all");
    const [date, setDate] = useState("all");
    const [sort, setSort] = useState("newest");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [customCategories, setCustomCategories] = useState<string[]>([]);
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadSettings = async () => {
            try {
                const res = await fetch("/api/settings", {
                    credentials: "include",
                    cache: "no-store",
                });
                if (!res.ok) return;
                const data: SettingsPayload = await res.json();
                if (!cancelled) {
                    setCustomCategories(
                        Array.isArray(data.customCategories) ? data.customCategories : []
                    );
                }
            } catch (loadError) {
                console.error("Could not load custom categories:", loadError);
            }
        };

        loadSettings();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        const fetchEmails = async () => {
            try {
                setLoading(true);
                setError(null);
                const params = new URLSearchParams({
                    category,
                    confidence,
                    date,
                    sort,
                    limit: String(pageSize),
                    offset: String((currentPage - 1) * pageSize),
                });

                const res = await fetch(`/api/sent-emails?${params.toString()}`, {
                    credentials: "include",
                    cache: "no-store",
                    signal: controller.signal,
                });
                const data: PaginatedEmailsResponse | Email[] = await res.json().catch(() => []);
                if (!res.ok) {
                    const message =
                        !Array.isArray(data) && "error" in (data as object)
                            ? String((data as { error?: string }).error || "")
                            : "Failed to fetch sent emails";
                    throw new Error(message);
                }

                if (Array.isArray(data)) {
                    setEmails(data);
                    setTotal(data.length);
                    return;
                }

                setEmails(Array.isArray(data.emails) ? data.emails : []);
                setTotal(Number.isFinite(data.total) ? data.total : 0);
            } catch (fetchError) {
                if ((fetchError as Error).name === "AbortError") return;
                console.error(fetchError);
                setError("Could not load sent emails.");
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
    }, [category, confidence, date, sort, currentPage, pageSize]);

    useEffect(() => {
        setCurrentPage(1);
    }, [category, confidence, date, sort, pageSize]);

    const categoryOptions = useMemo(() => {
        const defaultValues = new Set(BASE_CATEGORY_OPTIONS.map((item) => item.value));
        const customOptions = customCategories
            .filter((value) => value && !defaultValues.has(value))
            .map((value) => ({ label: toTitleCase(value), value }));

        return [...BASE_CATEGORY_OPTIONS, ...customOptions, { label: "All", value: "all" }];
    }, [customCategories]);

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

    const updateEmail = (id: string, updated: Partial<Email>) => {
        setEmails((prev) =>
            prev.map((email) => (email.id === id ? { ...email, ...updated } : email))
        );
        setSelectedEmail((prev) =>
            prev && prev.id === id ? { ...prev, ...updated } : prev
        );
    };

    const saveFromModal = async (email: EmailModalData, replyText: string) => {
        const res = await fetch("/api/ready-to-send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                emailId: email.id,
                manualReply: replyText,
                aiReply: replyText,
                saveOnly: true,
            }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            throw new Error(data?.error || "Save failed");
        }

        updateEmail(email.id, { manualReply: replyText, aiReply: replyText });
    };

    const sendFromModal = async (email: EmailModalData, replyText: string) => {
        const res = await fetch("/api/ready-to-send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                emailId: email.id,
                subject: email.subject,
                sender: email.sender,
                body: email.body || "",
                manualReply: replyText,
                sendNow: true,
            }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            throw new Error(data?.error || "Send failed");
        }

        updateEmail(email.id, { manualReply: replyText, aiReply: replyText, tag: "sent" });
        setSelectedEmail(null);
    };

    if (loading) return <SuperLoading variant="list" label="Loading sent emails" />;

    return (
        <div className="flex h-full min-w-0 flex-col gap-4 overflow-auto">
            <PageHeader
                title="Sent Emails"
                subtitle="History of delivered replies"
                stats={[
                    { icon: Sparkles, label: "Delivery", value: "Stable", color: "text-primary" },
                    { icon: CheckCheck, label: "Total Sent", value: total, color: "text-success" },
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
                    <Select
                        label="Category"
                        value={category}
                        options={categoryOptions}
                        onChange={setCategory}
                    />
                    <Select
                        label="Confidence"
                        value={confidence}
                        options={CONFIDENCE_OPTIONS}
                        onChange={setConfidence}
                    />
                    <Select label="Date" value={date} options={DATE_OPTIONS} onChange={setDate} />
                    <Select label="Sort" value={sort} options={SORT_OPTIONS} onChange={setSort} />
                </div>
            </div>

            <div className="flex flex-wrap gap-3 text-xs">
                <Stat label="Filtered Total" value={total} color="text-success" />
                <Stat label="Page" value={totalPages === 0 ? 0 : currentPage} color="text-primary" />
            </div>

            <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto pe-1">
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
                        tag="sent"
                        onSelect={() => setSelectedEmail(email)}
                    />
                ))}
                {!error && filteredEmails.length === 0 && (
                    <p className="text-xs text-muted">No sent emails found</p>
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
