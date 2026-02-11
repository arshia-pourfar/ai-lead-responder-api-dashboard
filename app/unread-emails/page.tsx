"use client";

import { useEffect, useState } from "react";
import { Search, Check, Sparkles } from "lucide-react";
import EmailItem from "@/components/email/EmailItem";
import Select from "@/components/ui/Select";
import Stat from "@/components/ui/Stat";
import PageHeader from "@/components/ui/Header";

interface Email {
    id: string;
    subject: string;
    sender: string;
    body?: string;
    aiReply?: string;
    manualReply?: string;
}

export default function UnreadEmailsPage() {
    const [emails, setEmails] = useState<Email[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    // ایمیل انتخاب‌شده برای نمایش مودال
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

    useEffect(() => {
        const fetchEmails = async () => {
            try {
                const res = await fetch("/api/unread-emails");
                const data = await res.json();
                setEmails(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error(err);
                setEmails([]);
            } finally {
                setLoading(false);
            }
        };

        fetchEmails();
    }, []);

    if (loading) return <p>Loading...</p>;

    return (
        <div className="h-full flex flex-col gap-4 overflow-auto">
            <PageHeader
                title="Unread Emails"
                subtitle="New messages waiting for AI or manual reply"
                stats={[
                    { icon: Sparkles, label: "AI Recommended", value: "–", color: "text-primary" },
                    { icon: Check, label: "Pending Responses", value: emails.length, color: "text-success" },
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
                    <Select label="Category" />
                    <Select label="AI Confidence" />
                    <Select label="Date" />
                    <Select label="Sort" />
                </div>
            </div>

            {/* QUICK STATS */}
            <div className="flex gap-3 text-xs">
                <Stat label="Total Unread" value={emails.length} color="text-success" />
            </div>

            {/* LIST */}
            <div className="flex-1 overflow-y-auto pe-1 scrollbar-thin flex flex-col gap-2">
                {emails.map((email) => (
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
                    />
                ))}
                {emails.length === 0 && <p className="text-xs text-muted">No unread emails</p>}
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
