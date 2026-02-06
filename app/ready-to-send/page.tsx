"use client";

import { useState } from "react";
import { Search, Check, Sparkles } from "lucide-react";
import EmailItem from "@/components/email/EmailItem";
import Select from "@/components/ui/Select";
import Stat from "@/components/ui/Stat";

const dummy = Array.from({ length: 12 });

export default function ReadyToSendPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="h-full flex flex-col gap-4">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ready To Send</h1>
          <p className="text-xs text-muted">AI Replies Waiting Approval</p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 border border-border px-2 py-1 rounded-md">
            <Sparkles size={14} className="text-primary" />
            AI Accuracy 91%
          </div>

          <button className="flex items-center gap-1 px-3 py-1 border border-success rounded-md text-success hover:bg-success/10">
            <Check size={14} />
            Confirm All
          </button>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="border border-border rounded-xl p-3 flex flex-col gap-3">

        {/* SEARCH */}
        <div className="flex items-center gap-2 border border-border rounded-md px-3 py-2">
          <Search size={16} className="text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subject, sender..."
            className="bg-transparent outline-none text-sm w-full"
          />
        </div>

        {/* FILTER ROW */}
        <div className="flex flex-wrap gap-3 text-xs">
          <Select label="Category" />
          <Select label="Confidence" />
          <Select label="Date" />
          <Select label="Sort" />
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="flex gap-3 text-xs">
        <Stat label="High" value={6} color="text-success" />
        <Stat label="Medium" value={4} color="text-primary" />
        <Stat label="Review" value={2} color="text-accent" />
      </div>

      {/* LIST ACTION BAR */}
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted">12 emails</span>

        <div className="flex gap-2">
          <button className="border border-border px-2 py-1 rounded-md hover:border-primary">
            Select All
          </button>
          <button className="border border-success px-2 py-1 rounded-md text-success hover:bg-success/10">
            Confirm Selected
          </button>
        </div>
      </div>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto pe-1 scrollbar-thin">
        {dummy.map((_, i) => (
          <EmailItem
            key={i}
            subject={`AI Reply ${i + 1}`}
            sender="client@mail.com"
            tag="ready"
          />
        ))}
      </div>
    </div>
  );
}
