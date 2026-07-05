"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Mail, Clock, Sparkles, Pencil, Send } from "lucide-react";

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
type TabType = "message" | "reply";

const VIEW_PREF_KEY = "email_viewer_pref";

function getViewPreference(): BodyViewMode | null {
    if (typeof window === "undefined") return null;
    try {
        const saved = localStorage.getItem(VIEW_PREF_KEY);
        if (saved === "rendered" || saved === "plain") return saved;
    } catch {}
    return null;
}

function saveViewPreference(mode: BodyViewMode) {
    try {
        localStorage.setItem(VIEW_PREF_KEY, mode);
    } catch {}
}

function formatDate(value?: string | Date | null): string {
    if (!value) return "Unknown";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
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

function looksLikeHtml(value: string): boolean {
    return /<\/?[a-z][\s\S]*>/i.test(value);
}

function getInitial(name: string): string {
    return name?.charAt(0)?.toUpperCase() || "?";
}

const TAG_COLORS: Record<string, string> = {
    ready: "bg-primary/10 text-primary border-primary/20",
    unread: "bg-tag-unread/10 text-tag-unread border-tag-unread/20",
    sent: "bg-tag-sent/10 text-tag-sent border-tag-sent/20",
    important: "bg-tag-important/10 text-tag-important border-tag-important/20",
};

export default function EmailDetailModal({
    email,
    onClose,
    onEdit,
    onSend,
}: EmailDetailModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>("message");
    const [isEditing, setIsEditing] = useState(false);
    const [draftReply, setDraftReply] = useState("");
    const [saving, setSaving] = useState(false);
    const [sending, setSending] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [bodyViewMode, setBodyViewMode] = useState<BodyViewMode>("plain");

    const htmlCandidate = useMemo(() => {
        const explicitHtml = (email?.bodyHtml || "").trim();
        if (explicitHtml) return explicitHtml;

        const bodyValue = email?.body || "";
        return looksLikeHtml(bodyValue) ? bodyValue : "";
    }, [email?.body, email?.bodyHtml]);

    useEffect(() => {
        if (!email) return;
        setIsEditing(false);
        setActionError(null);
        setDraftReply((email.manualReply || email.aiReply || "").trim());

        const savedPref = getViewPreference();
        if (savedPref) {
            setBodyViewMode(savedPref);
        } else {
            setBodyViewMode(htmlCandidate ? "rendered" : "plain");
        }
    }, [email, htmlCandidate]);

    const displayConfidence = useMemo(() => {
        if (!email?.confidence && email?.confidence !== 0) return "N/A";
        return String(email.confidence).toUpperCase();
    }, [email]);

    const sanitizedHtmlBody = useMemo(
        () => sanitizeEmailHtml(htmlCandidate),
        [htmlCandidate]
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
            <div className="flex max-h-[96dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl sm:max-h-[92dvh]">
                {/* Header */}
                <div className="border-b border-border bg-card/50 px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-semibold text-text leading-snug">
                                {email.subject || "No Subject"}
                            </h3>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                                <div className="flex items-center gap-1.5">
                                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                        {getInitial(email.sender)}
                                    </div>
                                    <span className="font-medium text-text">{email.sender || "unknown"}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock size={12} />
                                    <span>{formatDate(email.createdAt)}</span>
                                </div>
                                {email.tag && (
                                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${TAG_COLORS[email.tag] || "bg-border/50 text-muted"}`}>
                                        {email.tag}
                                    </span>
                                )}
                                <div className="flex items-center gap-1">
                                    <Sparkles size={12} className="text-primary" />
                                    <span className="font-medium">{displayConfidence}</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-lg border border-border p-1.5 text-muted transition hover:bg-border/40 hover:text-text"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-border bg-card/30 px-5">
                    <div className="flex gap-1">
                        <TabButton
                            active={activeTab === "message"}
                            onClick={() => setActiveTab("message")}
                            icon={Mail}
                            label="Message"
                        />
                        <TabButton
                            active={activeTab === "reply"}
                            onClick={() => setActiveTab("reply")}
                            icon={Pencil}
                            label="Reply"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {activeTab === "message" && (
                        <div className="rounded-xl border border-border bg-card/30">
                            {/* Header bar */}
                            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                                <span className="text-xs font-medium text-muted">
                                    {hasHtmlBody && bodyViewMode === "rendered" ? "HTML Email" : "Plain Text"}
                                </span>
                                {hasHtmlBody && (
                                    <button
                                        onClick={() => {
                                            const next = bodyViewMode === "rendered" ? "plain" : "rendered";
                                            setBodyViewMode(next);
                                            saveViewPreference(next);
                                        }}
                                        className="text-xs text-primary hover:underline"
                                    >
                                        {bodyViewMode === "rendered" ? "View plain text" : "View HTML"}
                                    </button>
                                )}
                            </div>

                            {/* Body */}
                            {bodyViewMode === "rendered" && hasHtmlBody ? (
                                <div
                                    className="email-html-content m-3 overflow-auto rounded-lg border border-border/50 bg-white p-4 text-sm text-black shadow-inner"
                                    style={{ maxHeight: "60dvh" }}
                                    dangerouslySetInnerHTML={{ __html: sanitizedHtmlBody }}
                                />
                            ) : (
                                <pre className="m-3 overflow-auto whitespace-pre-wrap wrap-break-word rounded-lg border border-border/50 bg-bg/70 p-4 font-sans text-sm leading-relaxed text-text shadow-inner" style={{ maxHeight: "60dvh" }}>
                                    {email.body || "No content"}
                                </pre>
                            )}
                        </div>
                    )}

                    {activeTab === "reply" && (
                        <div className="rounded-xl border border-border bg-card/30">
                            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                                <span className="text-xs font-medium text-muted">
                                    {isEditing ? "Edit Reply" : "AI Reply"}
                                </span>
                                {replyText && (
                                    <span className="text-[10px] text-muted">{replyText.length} chars</span>
                                )}
                            </div>

                            <div className="p-3">
                                {isEditing ? (
                                    <textarea
                                        value={draftReply}
                                        onChange={(event) => setDraftReply(event.target.value)}
                                        placeholder="Type your reply message here..."
                                        className="w-full resize-none rounded-lg border border-border bg-bg/70 p-4 font-sans text-sm leading-relaxed text-text placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                                        style={{ minHeight: "50dvh" }}
                                    />
                                ) : (
                                    <pre className="overflow-auto whitespace-pre-wrap wrap-break-word rounded-lg border border-border/50 bg-bg/70 p-4 font-sans text-sm leading-relaxed text-text shadow-inner" style={{ minHeight: "50dvh" }}>
                                        {replyText || "No AI reply available"}
                                    </pre>
                                )}
                            </div>
                        </div>
                    )}

                    {actionError && (
                        <div className="mt-3 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">
                            {actionError}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border bg-card/50 px-5 py-3">
                    <div className="text-xs text-muted">
                        {email.id.slice(0, 8)}...
                    </div>
                    <div className="flex items-center gap-2">
                        {onEdit && (
                            <button
                                onClick={handleEdit}
                                disabled={saving}
                                className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm font-medium text-accent transition hover:bg-accent/10 disabled:opacity-50"
                            >
                                <Pencil size={14} />
                                {isEditing ? "Save" : "Edit"}
                            </button>
                        )}
                        {onSend && (
                            <button
                                onClick={handleSend}
                                disabled={sending}
                                className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/10 disabled:opacity-50"
                            >
                                <Send size={14} />
                                {sending ? "Sending..." : "Send"}
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition hover:border-primary/30 hover:text-text"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TabButton({
    active,
    onClick,
    icon: Icon,
    label,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition ${
                active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:text-text"
            }`}
        >
            <Icon size={14} />
            {label}
        </button>
    );
}
