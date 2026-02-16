"use client";

import { useEffect, useMemo, useState } from "react";

export interface EmailModalData {
    id: string;
    subject: string;
    sender: string;
    body?: string;
    aiReply?: string;
    manualReply?: string;
    createdAt?: string | Date | null;
    confidence?: string | number | null;
    tag?: "ready" | "unread" | "sent" | "important";
}

interface EmailDetailModalProps {
    email: EmailModalData | null;
    onClose: () => void;
    onEdit?: (email: EmailModalData, replyText: string) => Promise<void> | void;
    onSend?: (email: EmailModalData, replyText: string) => Promise<void> | void;
}

function formatDate(value?: string | Date | null): string {
    if (!value) return "Unknown";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleString();
}

export default function EmailDetailModal({
    email,
    onClose,
    onEdit,
    onSend,
}: EmailDetailModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [draftReply, setDraftReply] = useState("");
    const [saving, setSaving] = useState(false);
    const [sending, setSending] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    useEffect(() => {
        if (!email) return;
        setIsEditing(false);
        setActionError(null);
        setDraftReply((email.manualReply || email.aiReply || "").trim());
    }, [email]);

    const displayConfidence = useMemo(() => {
        if (!email?.confidence && email?.confidence !== 0) return "N/A";
        return String(email.confidence).toUpperCase();
    }, [email]);

    if (!email) return null;

    const replyText = (draftReply || email.manualReply || email.aiReply || "").trim();

    const handleEdit = async () => {
        if (!onEdit) return;

        if (!isEditing) {
            setIsEditing(true);
            return;
        }

        if (!replyText) {
            setActionError("Reply text cannot be empty.");
            return;
        }

        try {
            setSaving(true);
            setActionError(null);
            await onEdit(email, replyText);
            setIsEditing(false);
        } catch (error) {
            console.error(error);
            setActionError("Failed to save email changes.");
        } finally {
            setSaving(false);
        }
    };

    const handleSend = async () => {
        if (!onSend) return;
        if (!replyText) {
            setActionError("Reply text cannot be empty.");
            return;
        }

        try {
            setSending(true);
            setActionError(null);
            await onSend(email, replyText);
        } catch (error) {
            console.error(error);
            setActionError("Failed to send email.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4">
            <div className="flex max-h-[95dvh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-bg sm:max-h-[90vh]">
                <div className="border-b border-border px-4 py-3 sm:px-6 sm:py-4">
                    <h3 className="break-words text-base font-semibold sm:text-lg">{email.subject || "No Subject"}</h3>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
                        <span>Sender: {email.sender || "unknown"}</span>
                        <span>Date: {formatDate(email.createdAt)}</span>
                        <span>Confidence: {displayConfidence}</span>
                    </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">
                    <div className="border border-border rounded-lg p-3 bg-card/30">
                        <p className="text-xs font-semibold text-muted mb-2">Email Body</p>
                        <p className="text-sm text-text whitespace-pre-wrap break-words">
                            {email.body || "No content"}
                        </p>
                    </div>

                    <div className="border border-border rounded-lg p-3 bg-card/30">
                        <p className="text-xs font-semibold text-muted mb-2">AI Generated Reply</p>
                        {isEditing ? (
                            <textarea
                                value={draftReply}
                                onChange={(event) => setDraftReply(event.target.value)}
                                className="h-40 w-full resize-none rounded-md border border-border bg-bg/60 p-2 text-sm"
                            />
                        ) : (
                            <p className="text-sm text-text whitespace-pre-wrap break-words">
                                {replyText || "No AI reply available"}
                            </p>
                        )}
                    </div>

                    {actionError && <p className="text-xs text-danger">{actionError}</p>}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3 sm:px-6 sm:py-4">
                    <button
                        onClick={handleEdit}
                        disabled={!onEdit || saving}
                        className="rounded-md border border-accent px-3 py-2 text-sm text-accent hover:bg-accent/10 disabled:opacity-50 sm:px-4"
                    >
                        {isEditing ? "Save" : "Edit"}
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={!onSend || sending}
                        className="rounded-md border border-success px-3 py-2 text-sm text-success hover:bg-success/10 disabled:opacity-50 sm:px-4"
                    >
                        {sending ? "Sending..." : "Send"}
                    </button>
                    <button
                        onClick={onClose}
                        className="rounded-md border border-border px-3 py-2 text-sm hover:border-primary sm:px-4"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
