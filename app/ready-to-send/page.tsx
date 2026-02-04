"use client";
import { useState } from "react";
import EmailItem from "@/components/email/EmailItem";

export default function ReadyToSend() {
  const [search, setSearch] = useState("");

  const emails = Array.from({ length: 20 }).filter((_, i) =>
    `Subject ${i}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-3 mb-4">
        <input
          className="bg-card border border-border rounded-xl p-2 flex-1"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="bg-primary hover:bg-primary-hover text-white px-4 rounded-xl">
          Send
        </button>
      </div>

      <div className="overflow-y-auto flex-1">
        {emails.map((_, i) => (
          <EmailItem key={i} subject={`Subject ${i}`} sender="ai@mail.com" tag="ready" />
        ))}
      </div>
    </div>
  );
}
