"use client";

import { useState } from "react";
import { Search, DollarSign, Sparkles } from "lucide-react";
import EmailItem from "@/components/email/EmailItem";
import Select from "@/components/ui/Select";
import Stat from "@/components/ui/Stat";
import PageHeader from "@/components/ui/Header";

const dummy = Array.from({ length: 10 });

export default function ReadyToSellPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="h-full flex flex-col gap-4 overflow-auto">

      {/* HEADER */}
      <PageHeader
        title="Ready To Sell"
        subtitle="AI Detected Sales Leads"
        stats={[
          { icon: Sparkles, label: "Accuracy", value: "87%", color: "text-primary" },
          { icon: DollarSign, label: "Potential", value: "$4,200", color: "text-success" },
        ]}
      />

      {/* FILTER PANEL */}
      <div className="border border-border rounded-xl p-3 flex flex-col gap-3">
        {/* SEARCH */}
        <div className="flex items-center gap-2 border border-border rounded-md px-3 py-2">
          <Search size={16} className="text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="bg-transparent outline-none text-sm w-full"
          />
        </div>

        {/* FILTER ROW */}
        <div className="flex flex-wrap gap-3 text-xs">
          <Select label="Score" />
          <Select label="Date" />
          <Select label="Source" />
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="flex gap-3 text-xs">
        <Stat label="Hot Leads" value={3} color="text-red-500" />
        <Stat label="Warm" value={4} color="text-primary" />
        <Stat label="Cold" value={3} color="text-muted" />
      </div>

      {/* LIST HEADER */}
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted">{dummy.length} Leads</span>
        <button className="border border-border px-2 py-1 rounded-md hover:border-primary">
          Export CSV
        </button>
      </div>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto pe-1 scrollbar-thin flex flex-col gap-2">
        {dummy.map((_, i) => (
          <EmailItem
            key={i}
            subject={`Potential Client ${i + 1}`}
            sender="lead@mail.com"
            tag="important"
            sellScore={80 - i * 5}
          />
        ))}
      </div>
    </div>
  );
}
