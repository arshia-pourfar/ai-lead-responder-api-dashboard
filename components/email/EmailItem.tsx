"use client";

import { useState } from "react";
import { Check, Eye, Pencil } from "lucide-react";

type TagType = "ready" | "unread" | "sent" | "important";

export default function EmailItem({
    subject,
    sender,
    tag,
    sellScore,
}: {
    subject: string;
    sender: string;
    tag: TagType;
    sellScore?: number;
}) {
    const [decision, setDecision] = useState<"ai" | "ignore" | "manual" | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [manualText, setManualText] = useState("");

    const tagMap = {
        ready: "bg-tag-ready/20 text-tag-ready",
        unread: "bg-tag-unread/20 text-tag-unread",
        sent: "bg-tag-sent/20 text-tag-sent",
        important: "bg-tag-important/20 text-tag-important",
    };

    return (
        <>
            <div className="p-3 border border-border rounded-lg my-2 flex flex-col gap-2">

                {/* HEADER */}
                <div className="flex items-start justify-between gap-3">

                    {/* LEFT SIDE */}
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

                    {/* RIGHT ACTIONS */}
                    {(tag === "ready" || tag === "unread") && (
                        <div className="flex gap-1">
                            {/* VIEW */}
                            <button
                                onClick={() => setShowModal(true)}
                                className="p-1.5 border border-border rounded-md text-muted hover:border-primary"
                            >
                                <Eye size={14} />
                            </button>

                            {/* EDIT فقط READY */}
                            {tag === "ready" && (
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className="p-1.5 border border-accent rounded-md text-accent hover:bg-accent/10"
                                >
                                    <Pencil size={14} />
                                </button>
                            )}

                            {/* CONFIRM */}
                            <button
                                className="p-1.5 border border-success rounded-md text-success hover:bg-success/10"
                            >
                                <Check size={14} />
                            </button>
                        </div>
                    )}
                    {(tag === "important") && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="p-2 border border-border rounded-md text-muted hover:border-primary hover:text-primary"
                        >
                            <Eye size={16} />
                        </button>
                    )}
                </div>

                {/* UNREAD OPTIONS */}
                {tag === "unread" && (
                    <div className="flex gap-2 mt-1">
                        <DecisionBtn
                            label="AI Reply"
                            active={decision === "ai"}
                            onClick={() => setDecision("ai")}
                        />
                        <DecisionBtn
                            label="Ignore"
                            active={decision === "ignore"}
                            onClick={() => setDecision("ignore")}
                        />
                        <DecisionBtn
                            label="Manual"
                            active={decision === "manual"}
                            onClick={() => setDecision("manual")}
                        />
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
                        placeholder="Edit AI reply..."
                        className="mt-2 p-2 border border-border rounded-md text-sm h-24 resize-none bg-bg/50"
                    />
                )}

                {/* SENT RESULT */}
                {tag === "sent" && (
                    <div className="text-xs text-muted mt-1">
                        ✔ Sent successfully — Support Category
                    </div>
                )}

                {/* IMPORTANT SELL SCORE */}
                {tag === "important" && sellScore !== undefined && (
                    <div className="text-xs font-semibold mt-1 flex items-center gap-2">
                        <span className="text-muted">AI Sell Chance:</span>
                        <span className="text-accent font-semibold">
                            {sellScore}%
                        </span>
                    </div>
                )}

            </div>

            {/* MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center rounded-xl justify-center z-50">
                    <div className="bg-bg border border-border rounded-xl p-4 w-10/12">
                        <h3 className="font-semibold mb-2">Email Preview</h3>
                        <p className="text-sm text-muted leading-6">
                            Full email content preview here...
                        </p>

                        <button
                            onClick={() => setShowModal(false)}
                            className="mt-4 px-3 py-1 text-xs border border-border rounded-md hover:border-primary"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

/* OPTION BUTTON */
function DecisionBtn({
    label,
    active,
    onClick,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`px-2 py-1 text-xs rounded-md border transition
        ${active
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted hover:border-primary"
                }`}
        >
            {label}
        </button>
    );
}   
