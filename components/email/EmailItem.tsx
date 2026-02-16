"use client";

import { useEffect, useState } from "react";
import { Check, Eye, Pencil } from "lucide-react";

type TagType = "ready" | "unread" | "sent" | "important";

interface EmailProps {
    id: string;
    subject: string;
    sender: string;
    manualReply?: string;
    body: string;
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
        aiReply: string;
        manualReply: string;
        tag: "ready";
    }) => void;
}

export default function EmailItem({
    id,
    subject,
    sender,
    body,
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

    const tagMap = {
        ready: "bg-tag-ready/20 text-tag-ready",
        unread: "bg-tag-unread/20 text-tag-unread",
        sent: "bg-tag-sent/20 text-tag-sent",
        important: "bg-tag-important/20 text-tag-important",
    };

    // ---------- APPROVE EMAIL (move to ready without sending) ----------
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
                const data = await aiRes.json();
                finalText = data.reply || "Thanks for reaching out!";
                setEditText(finalText);
                setManualText(finalText);
            }

            if (!finalText.trim()) {
                alert("Empty reply, cannot approve");
                return;
            }

            // فقط move به ready و ذخیره متن، ارسال نمی‌کنه
            const approveRes = await fetch("/api/unread-emails", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    emailId: id,
                    subject,
                    sender,
                    body,
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
            alert("Failed to approve email");
        } finally {
            setApproving(false);
        }
    };

    // ---------- SAVE EDIT (only save text, no send) ----------
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

    // ---------- FINAL SEND (only here send) ----------
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
        <div className="my-1 flex min-w-0 flex-col gap-2 rounded-lg border bg-card border-border p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="w-3/4 flex flex-col gap-1">
                    <div className="max-w-full flex flex-wrap justify-between items-start gap-2 sm:gap-3">
                        <div className="min-w-0 max-w-3/4">
                            <p className="wrap-break-word text-sm font-semibold text-text">{subject}</p>
                            <p className="break-all text-xs text-muted">{sender}</p>
                        </div>
                        <span className={`shrink-0 rounded px-2 py-1 text-xs ${tagMap[tag]}`}>{tag}</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-1 self-end sm:self-auto">
                    <button
                        onClick={onSelect}
                        className="rounded-md border border-border p-1.5 text-muted hover:border-primary"
                    >
                        <Eye size={14} />
                    </button>

                    {tag === "unread" && (
                        <button
                            onClick={handleApproveModel}
                            disabled={approving}
                            className="rounded-md border border-success p-1.5 text-success hover:bg-success/10 disabled:opacity-50"
                        >
                            <Check size={14} />
                        </button>
                    )}

                    {tag === "ready" && (
                        <>
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="rounded-md border border-accent p-1.5 text-accent hover:bg-accent/10"
                                >
                                    <Pencil size={14} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={savingEdit}
                                    className="rounded-md border border-success p-1.5 text-success hover:bg-success/10 disabled:opacity-50"
                                >
                                    <Check size={14} />
                                </button>
                            )}

                            <button
                                onClick={handleFinalConfirm}
                                disabled={sending}
                                className="rounded-md border border-success p-1.5 text-success hover:bg-success/10 disabled:opacity-50"
                            >
                                <Check size={14} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {tag === "unread" && (
                <div className="mt-1 flex flex-wrap gap-2">
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
                    className="mt-2 p-2 border border-border rounded-md text-sm h-24 resize-none bg-bg/50"
                />
            )}

            {tag === "ready" && isEditing && (
                <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="mt-2 p-2 border border-border rounded-md text-sm h-24 resize-none bg-bg/50"
                />
            )}
        </div>
    );
}

function DecisionBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-2 py-1 text-xs rounded-md border transition ${active ? "border-primary text-primary bg-primary/10" : "border-border text-muted hover:border-primary"
                }`}
        >
            {label}
        </button>
    );
}
