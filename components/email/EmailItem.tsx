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
                await fetch("/api/unread-emails", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ emailId: id, ignore: true }),
                });
                onUpdateEmail?.(id, { tag: "ready" });
                alert("Marked as read");
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
            await fetch("/api/unread-emails", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    emailId: id,
                    subject,
                    sender,
                    body,
                    text: finalText,
                    category: "support",
                }),
            });

            onUpdateEmail?.(id, { manualReply: finalText, aiReply: finalText, tag: "ready" });
            alert("Moved to Ready!");
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
                    saveOnly: true, // مهم: فقط ذخیره، ارسال نمی‌کنه
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Save failed");

            setIsEditing(false);
            onUpdateEmail?.(id, { manualReply: editText, aiReply: editText });
            alert("Saved!");
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
        const finalReply = isEditing ? editText : decision === "manual" ? manualText : aiReply || "";

        try {
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
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Send failed");

            onUpdateEmail?.(id, { manualReply: finalReply, aiReply: finalReply, tag: "sent" });
            alert("Email sent!");
        } catch (err) {
            console.error(err);
            alert("Failed to send email");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="p-3 border border-border rounded-lg my-2 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <div>
                            <p className="font-semibold text-sm text-text">{subject}</p>
                            <p className="text-xs text-muted">{sender}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${tagMap[tag]}`}>{tag}</span>
                    </div>
                </div>

                <div className="flex gap-1">
                    <button
                        onClick={onSelect}
                        className="p-1.5 border border-border rounded-md text-muted hover:border-primary"
                    >
                        <Eye size={14} />
                    </button>

                    {tag === "unread" && (
                        <button
                            onClick={handleApproveModel}
                            disabled={approving}
                            className="p-1.5 border border-success rounded-md text-success hover:bg-success/10 disabled:opacity-50"
                        >
                            <Check size={14} />
                        </button>
                    )}

                    {tag === "ready" && (
                        <>
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-1.5 border border-accent rounded-md text-accent hover:bg-accent/10"
                                >
                                    <Pencil size={14} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={savingEdit}
                                    className="p-1.5 border border-success rounded-md text-success hover:bg-success/10 disabled:opacity-50"
                                >
                                    <Check size={14} />
                                </button>
                            )}

                            <button
                                onClick={handleFinalConfirm}
                                disabled={sending}
                                className="p-1.5 border border-success rounded-md text-success hover:bg-success/10 disabled:opacity-50"
                            >
                                <Check size={14} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {tag === "unread" && (
                <div className="flex gap-2 mt-1">
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
