"use client";

import { useEffect, useState } from "react";
import { Check, Eye, Pencil, Send } from "lucide-react";

type TagType = "ready" | "unread" | "sent" | "important";

interface EmailProps {
    id: string;
    subject: string;
    sender: string;
    manualReply?: string;
    body: string;
    bodyHtml?: string;
    aiReply?: string;
    tag: TagType;
    onSelect?: () => void;
    onUpdateEmail?: (id: string, updated: Partial<EmailProps>) => void;
    onRemoveEmail?: (id: string) => void;
    onMoveToReady?: (email: {
        id: string;
        subject: string;
        sender: string;
        body: string;
        bodyHtml?: string;
        aiReply: string;
        manualReply: string;
        tag: "ready";
    }) => void;
}

const TAG_STYLES: Record<TagType, string> = {
    ready: "bg-primary/10 text-primary border-primary/20",
    unread: "bg-tag-unread/10 text-tag-unread border-tag-unread/20",
    sent: "bg-tag-sent/10 text-tag-sent border-tag-sent/20",
    important: "bg-tag-important/10 text-tag-important border-tag-important/20",
};

export default function EmailItem({
    id,
    subject,
    sender,
    body,
    bodyHtml,
    manualReply,
    aiReply,
    tag,
    onSelect,
    onUpdateEmail,
    onRemoveEmail,
    onMoveToReady,
}: EmailProps) {
    const [decision, setDecision] = useState<"ai" | "ignore" | "manual" | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(aiReply || "");
    const [manualText, setManualText] = useState(manualReply || "");
    const [savingEdit, setSavingEdit] = useState(false);
    const [sending, setSending] = useState(false);
    const [approving, setApproving] = useState(false);

    useEffect(() => {
        setEditText(aiReply || "");
        setManualText(manualReply || "");
    }, [aiReply, manualReply]);

    const handleApproveModel = async () => {
        if (!decision) return;
        setApproving(true);

        try {
            let finalText = "";

            if (decision === "ignore") {
                const res = await fetch("/api/unread-emails", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ emailId: id, ignore: true }),
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => null);
                    throw new Error(data?.error || "Failed to ignore email");
                }
                onRemoveEmail?.(id);
                return;
            }

            if (decision === "manual") finalText = manualText;

            if (decision === "ai") {
                const aiRes = await fetch("/api/ai-analyze-lead", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ category: "support", message: body }),
                });
                const data = await aiRes.json().catch(() => null);
                if (!aiRes.ok) {
                    throw new Error(data?.error || "Could not generate AI reply");
                }

                finalText = String(data?.reply || "").trim();
                setEditText(finalText);
                setManualText(finalText);
            }

            if (!finalText.trim()) {
                alert("Empty reply, cannot approve");
                return;
            }

            const approveRes = await fetch("/api/unread-emails", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    emailId: id,
                    subject,
                    sender,
                    body,
                    bodyHtml: bodyHtml || "",
                    text: finalText,
                }),
            });
            const approveData = await approveRes.json().catch(() => null);
            if (!approveRes.ok) {
                throw new Error(approveData?.error || "Failed to approve email");
            }

            if (approveData?.readyEmail) {
                onMoveToReady?.(approveData.readyEmail);
            }
            onRemoveEmail?.(id);
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : "Failed to approve email";
            alert(message);
        } finally {
            setApproving(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editText.trim()) return;
        setSavingEdit(true);

        try {
            const res = await fetch("/api/ready-to-send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    emailId: id,
                    manualReply: editText,
                    aiReply: editText,
                    saveOnly: true,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Save failed");

            setIsEditing(false);
            onUpdateEmail?.(id, { manualReply: editText, aiReply: editText });
        } catch (err) {
            console.error(err);
            alert("Failed to save edit");
        } finally {
            setSavingEdit(false);
        }
    };

    const handleFinalConfirm = async () => {
        setSending(true);
        const finalReply = (isEditing ? editText : manualText || aiReply || "").trim();

        try {
            if (!finalReply) {
                throw new Error("Reply text cannot be empty");
            }

            const res = await fetch("/api/ready-to-send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    emailId: id,
                    subject,
                    sender,
                    body,
                    manualReply: finalReply,
                    sendNow: true,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Send failed");

            onUpdateEmail?.(id, { manualReply: finalReply, aiReply: finalReply, tag: "sent" });
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : "Failed to send email";
            alert(message);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="group rounded-xl border border-border bg-bg/50 p-3 transition hover:border-primary/20 hover:bg-card">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-text">{subject}</p>
                            <p className="mt-0.5 truncate text-xs text-muted">{sender}</p>
                        </div>
                        <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium ${TAG_STYLES[tag]}`}>
                            {tag}
                        </span>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                    <button
                        onClick={onSelect}
                        title="View details"
                        className="rounded-lg border border-border p-1.5 text-muted transition hover:border-primary hover:text-primary"
                    >
                        <Eye size={14} />
                    </button>

                    {tag === "unread" && (
                        <button
                            onClick={handleApproveModel}
                            disabled={approving}
                            title="Approve"
                            className="rounded-lg border border-success/30 bg-success/5 p-1.5 text-success transition hover:bg-success/10 disabled:opacity-50"
                        >
                            <Check size={14} />
                        </button>
                    )}

                    {tag === "ready" && (
                        <>
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    title="Edit reply"
                                    className="rounded-lg border border-accent/30 bg-accent/5 p-1.5 text-accent transition hover:bg-accent/10"
                                >
                                    <Pencil size={14} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={savingEdit}
                                    title="Save changes"
                                    className="rounded-lg border border-success/30 bg-success/5 p-1.5 text-success transition hover:bg-success/10 disabled:opacity-50"
                                >
                                    <Check size={14} />
                                </button>
                            )}

                            <button
                                onClick={handleFinalConfirm}
                                disabled={sending}
                                title="Send now"
                                className="rounded-lg border border-primary/30 bg-primary/5 p-1.5 text-primary transition hover:bg-primary/10 disabled:opacity-50"
                            >
                                <Send size={14} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {tag === "unread" && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    <DecisionBtn label="AI Reply" active={decision === "ai"} onClick={() => setDecision("ai")} />
                    <DecisionBtn label="Ignore" active={decision === "ignore"} onClick={() => setDecision("ignore")} />
                    <DecisionBtn label="Manual" active={decision === "manual"} onClick={() => setDecision("manual")} />
                </div>
            )}

            {tag === "unread" && decision === "manual" && (
                <textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="Write manual reply..."
                    className="mt-2 w-full resize-none rounded-lg border border-border bg-bg/70 p-2.5 text-sm text-text placeholder:text-muted/50 focus:border-primary focus:outline-none"
                    rows={3}
                />
            )}

            {tag === "ready" && isEditing && (
                <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    placeholder="Edit reply message..."
                    className="mt-2 w-full resize-none rounded-lg border border-border bg-bg/70 p-2.5 text-sm text-text placeholder:text-muted/50 focus:border-primary focus:outline-none"
                    rows={3}
                />
            )}
        </div>
    );
}

function DecisionBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted hover:border-primary/50 hover:text-text"
            }`}
        >
            {label}
        </button>
    );
}
