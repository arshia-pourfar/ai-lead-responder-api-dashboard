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

    const handleApproveModel = async () => {
        if (!decision || decision === "ignore") return;

        const finalText =
            decision === "manual"
                ? manualText
                : aiReply || "";

        if (!finalText.trim()) return;

        setApproving(true);

        try {
            const res = await fetch("/api/unread-emails", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    emailId: id,
                    subject: subject,
                    text: finalText,
                    body: body,       // متن ایمیل اصلی
                    sender: sender,   // ایمیل فرستنده اضافه شد
                }),
            });


            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Approve failed");

            alert("Moved to Ready!");
        } catch (err) {
            console.error(err);
            alert("Failed to approve email");
        } finally {
            setApproving(false);
        }
    };

    // ---------- READY SAVE EDIT ----------
    const handleSaveEdit = async () => {
        if (!editText.trim()) return;

        setSavingEdit(true);
        try {
            const res = await fetch("/api/ready-to-send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    emailId: id,
                    aiReply: editText,
                    manualReply: editText,
                    saveOnly: true,
                }),
                credentials: "include",
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Save failed");

            alert("Saved!");
            setIsEditing(false);
        } catch (err) {
            console.error(err);
            alert("Failed");
        } finally {
            setSavingEdit(false);
        }
    };

    // ---------- FINAL SEND ----------
    const handleFinalConfirm = async () => {
        setSending(true);

        const finalReply =
            isEditing ? editText :
                decision === "manual" ? manualText :
                    aiReply || "";

        try {
            const res = await fetch("/api/ready-to-send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    emailId: id,
                    subject: subject,      // اضافه شد
                    sender: sender,        // اضافه شد
                    body: body,            // متن اصلی ایمیل
                    manualReply: finalReply,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Send failed");

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
            {/* HEADER */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <div>
                            <p className="font-semibold text-sm text-text">{subject}</p>
                            <p className="text-xs text-muted">{sender}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${tagMap[tag]}`}>
                            {tag}
                        </span>
                    </div>
                </div>

                {/* ACTIONS */}
                <div className="flex gap-1">
                    <button
                        onClick={onSelect}
                        className="p-1.5 border border-border rounded-md text-muted hover:border-primary"
                    >
                        <Eye size={14} />
                    </button>

                    {/* UNREAD CHECK */}
                    {tag === "unread" && (
                        <button
                            onClick={handleApproveModel}
                            disabled={approving}
                            className="p-1.5 border border-success rounded-md text-success hover:bg-success/10 disabled:opacity-50"
                        >
                            <Check size={14} />
                        </button>
                    )}

                    {/* READY EDIT */}
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

            {/* UNREAD OPTIONS */}
            {tag === "unread" && (
                <div className="flex gap-2 mt-1">
                    <DecisionBtn label="AI Reply" active={decision === "ai"} onClick={() => setDecision("ai")} />
                    <DecisionBtn label="Ignore" active={decision === "ignore"} onClick={() => setDecision("ignore")} />
                    <DecisionBtn label="Manual" active={decision === "manual"} onClick={() => setDecision("manual")} />
                </div>
            )}

            {/* MANUAL TEXT */}
            {tag === "unread" && decision === "manual" && (
                <textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="Write manual reply..."
                    className="mt-2 p-2 border border-border rounded-md text-sm h-24 resize-none bg-bg/50"
                />
            )}

            {/* READY EDIT */}
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
            className={`px-2 py-1 text-xs rounded-md border transition
        ${active ? "border-primary text-primary bg-primary/10" : "border-border text-muted hover:border-primary"}`}
        >
            {label}
        </button>
    );
}
