"use client";

import { Pencil, Check } from "lucide-react";
import { useState } from "react";

export default function EmailItem({
    subject,
    sender,
    tag,
    showConfirm = false, // فقط برای Ready To Send
}: {
    subject: string;
    sender: string;
    tag?: "ready" | "unread" | "sent" | "important";
    showConfirm?: boolean;
}) {
    const [editMode, setEditMode] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    const tagMap = {
        ready: "bg-tag-ready/20 text-tag-ready",
        unread: "bg-tag-unread/20 text-tag-unread",
        sent: "bg-tag-sent/20 text-tag-sent",
        important: "bg-tag-important/20 text-tag-important",
    };

    return (
        <div className="p-3 border border-border rounded-2xl mb-3 flex flex-col gap-1 shadow-sm hover:shadow-md transition duration-150">
            {/* SUBJECT + TAG */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="font-medium text-text">{subject}</p>
                    <p className="text-xs text-muted">{sender}</p>
                    {tag && (
                        <span
                            className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${tagMap[tag]}`}
                        >
                            {tag}
                        </span>
                    )}
                </div>

                <div className="flex gap-1">
                    {/* EDIT */}
                    <button
                        onClick={() => setEditMode(!editMode)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs hover:bg-primary/20 transition"
                    >
                        <Pencil size={14} />
                        Edit
                    </button>

                    {/* CONFIRM فقط برای Ready To Send */}
                    {showConfirm && (
                        <button
                            onClick={() => setConfirmed(!confirmed)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${confirmed
                                    ? "bg-success/20 text-success hover:bg-success/30"
                                    : "bg-success/10 text-success hover:bg-success/20"
                                } transition`}
                        >
                            <Check size={14} />
                            Confirm
                        </button>
                    )}
                </div>
            </div>

            {/* EDIT MODE */}
            {editMode && (
                <div className="mt-1 p-2 border border-border rounded-md bg-bg/50">
                    <input
                        className="w-full p-1 border border-border rounded-md text-sm"
                        defaultValue={subject}
                    />
                </div>
            )}
        </div>
    );
}
