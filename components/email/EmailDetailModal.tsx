"use client";

import { useEffect, useMemo, useState } from "react";

export interface EmailModalData {
    id: string;
    subject: string;
    sender: string;
    body?: string;
    bodyHtml?: string;
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

type BodyViewMode = "rendered" | "plain";

function formatDate(value?: string | Date | null): string {
    if (!value) return "Unknown";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleString();
}

function sanitizeEmailHtml(html: string): string {
    const normalized = html.trim();
    if (!normalized) return "";
    if (typeof window === "undefined") return normalized;

    const parser = new DOMParser();
    const documentNode = parser.parseFromString(normalized, "text/html");

    documentNode
        .querySelectorAll(
            "script,iframe,object,embed,form,input,button,textarea,select,link,meta,base"
        )
        .forEach((node) => node.remove());

    const elements = Array.from(documentNode.querySelectorAll("*"));
    for (const element of elements) {
        const attributes = Array.from(element.attributes);
        for (const attribute of attributes) {
            const name = attribute.name.toLowerCase();
            const value = attribute.value.trim().toLowerCase();
            if (name.startsWith("on")) {
                element.removeAttribute(attribute.name);
                continue;
            }
            if ((name === "href" || name === "src") && value.startsWith("javascript:")) {
                element.removeAttribute(attribute.name);
            }
        }

        if (element.tagName.toLowerCase() === "a") {
            element.setAttribute("target", "_blank");
            element.setAttribute("rel", "noopener noreferrer nofollow");
        }
    }

    return documentNode.body.innerHTML;
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
    const [bodyViewMode, setBodyViewMode] = useState<BodyViewMode>("plain");

    useEffect(() => {
        if (!email) return;
        setIsEditing(false);
        setActionError(null);
        setDraftReply((email.manualReply || email.aiReply || "").trim());
        setBodyViewMode((email.bodyHtml || "").trim() ? "rendered" : "plain");
    }, [email]);

    const displayConfidence = useMemo(() => {
        if (!email?.confidence && email?.confidence !== 0) return "N/A";
        return String(email.confidence).toUpperCase();
    }, [email]);

    const sanitizedHtmlBody = useMemo(
        () => sanitizeEmailHtml(email?.bodyHtml || ""),
        [email?.bodyHtml]
    );
    const hasHtmlBody = sanitizedHtmlBody.trim().length > 0;

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
            setActionError(
                error instanceof Error ? error.message : "Failed to save email changes."
            );
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
            setActionError(error instanceof Error ? error.message : "Failed to send email.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
            <div className="flex max-h-[95dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl sm:max-h-[92dvh]">
                <div className="border-b border-border px-4 py-4 sm:px-6">
                    <h3 className="wrap-break-word text-base font-semibold sm:text-lg">
                        {email.subject || "No Subject"}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
                        <span>Sender: {email.sender || "unknown"}</span>
                        <span>Date: {formatDate(email.createdAt)}</span>
                        <span>Confidence: {displayConfidence}</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-border bg-card/40 p-3">
                            <div className="mb-3 flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-muted">Message</p>
                                {hasHtmlBody && (
                                    <div className="flex items-center gap-1 rounded-md border border-border p-1">
                                        <button
                                            onClick={() => setBodyViewMode("rendered")}
                                            className={`rounded px-2 py-1 text-xs ${
                                                bodyViewMode === "rendered"
                                                    ? "bg-primary/15 text-primary"
                                                    : "text-muted"
                                            }`}
                                        >
                                            Rendered
                                        </button>
                                        <button
                                            onClick={() => setBodyViewMode("plain")}
                                            className={`rounded px-2 py-1 text-xs ${
                                                bodyViewMode === "plain"
                                                    ? "bg-primary/15 text-primary"
                                                    : "text-muted"
                                            }`}
                                        >
                                            Plain
                                        </button>
                                    </div>
                                )}
                            </div>

                            {bodyViewMode === "rendered" && hasHtmlBody ? (
                                <div
                                    className="email-html-content max-h-[46dvh] overflow-auto rounded-lg border border-border bg-white p-3 text-sm text-black"
                                    dangerouslySetInnerHTML={{ __html: sanitizedHtmlBody }}
                                />
                            ) : (
                                <pre className="max-h-[46dvh] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-bg/70 p-3 text-sm text-text">
                                    {email.body || "No content"}
                                </pre>
                            )}
                        </div>

                        <div className="rounded-xl border border-border bg-card/40 p-3">
                            <p className="mb-3 text-xs font-semibold text-muted">Reply</p>
                            {isEditing ? (
                                <textarea
                                    value={draftReply}
                                    onChange={(event) => setDraftReply(event.target.value)}
                                    className="h-[46dvh] w-full resize-none rounded-lg border border-border bg-bg/70 p-3 text-sm"
                                />
                            ) : (
                                <pre className="h-[46dvh] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-bg/70 p-3 text-sm text-text">
                                    {replyText || "No AI reply available"}
                                </pre>
                            )}
                        </div>
                    </div>

                    {actionError && <p className="mt-3 text-xs text-danger">{actionError}</p>}
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

