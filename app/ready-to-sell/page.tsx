"use client";

import { useEffect, useState } from "react";
import { Search, DollarSign, Sparkles } from "lucide-react";
import EmailItem from "@/components/email/EmailItem";
import Select from "@/components/ui/Select";
import Stat from "@/components/ui/Stat";
import PageHeader from "@/components/ui/Header";

interface Email {
  id: string;
  subject: string;
  sender: string;
  sellScore?: number;
}

export default function ReadyToSellPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const res = await fetch("/api/ready-to-sell");
        const data = await res.json();
        setEmails(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setEmails([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmails();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="h-full flex flex-col gap-4 overflow-auto">
      <PageHeader
        title="Ready To Sell"
        subtitle="AI Detected Sales Leads"
        stats={[
          { icon: Sparkles, label: "Accuracy", value: "87%", color: "text-primary" },
          { icon: DollarSign, label: "Potential", value: `$${emails.reduce((a, b) => a + (b.sellScore || 0) * 50, 0)}`, color: "text-success" },
        ]}
      />

      <div className="border border-border rounded-xl p-3 flex flex-col gap-3">
        <div className="flex items-center gap-2 border border-border rounded-md px-3 py-2">
          <Search size={16} className="text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="bg-transparent outline-none text-sm w-full"
          />
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <Select label="Score" />
          <Select label="Date" />
          <Select label="Source" />
        </div>
      </div>

      <div className="flex gap-3 text-xs">
        <Stat label="Hot Leads" value={emails.length} color="text-red-500" />
      </div>

      <div className="flex-1 overflow-y-auto pe-1 scrollbar-thin flex flex-col gap-2">
        {emails.map((email) => (
          <EmailItem
            key={email.id}
            subject={email.subject}
            sender={email.sender}
            tag="important"
            sellScore={email.sellScore}
          />
        ))}
        {emails.length === 0 && <p className="text-xs text-muted">No emails found</p>}
      </div>
    </div>
  );
}



// "use client";

// import { useState } from "react";
// import { Search, DollarSign, Sparkles } from "lucide-react";
// import EmailItem from "@/components/email/EmailItem";
// import Select from "@/components/ui/Select";
// import Stat from "@/components/ui/Stat";
// import PageHeader from "@/components/ui/Header";

// const dummy = Array.from({ length: 10 });

// export default function ReadyToSellPage() {
//   const [search, setSearch] = useState("");

//   return (
//     <div className="h-full flex flex-col gap-4 overflow-auto">

//       {/* HEADER */}
//       <PageHeader
//         title="Ready To Sell"
//         subtitle="AI Detected Sales Leads"
//         stats={[
//           { icon: Sparkles, label: "Accuracy", value: "87%", color: "text-primary" },
//           { icon: DollarSign, label: "Potential", value: "$4,200", color: "text-success" },
//         ]}
//       />

//       {/* FILTER PANEL */}
//       <div className="border border-border rounded-xl p-3 flex flex-col gap-3">
//         {/* SEARCH */}
//         <div className="flex items-center gap-2 border border-border rounded-md px-3 py-2">
//           <Search size={16} className="text-muted" />
//           <input
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             placeholder="Search leads..."
//             className="bg-transparent outline-none text-sm w-full"
//           />
//         </div>

//         {/* FILTER ROW */}
//         <div className="flex flex-wrap gap-3 text-xs">
//           <Select label="Score" />
//           <Select label="Date" />
//           <Select label="Source" />
//         </div>
//       </div>

//       {/* QUICK STATS */}
//       <div className="flex gap-3 text-xs">
//         <Stat label="Hot Leads" value={3} color="text-red-500" />
//         <Stat label="Warm" value={4} color="text-primary" />
//         <Stat label="Cold" value={3} color="text-muted" />
//       </div>

//       {/* LIST HEADER */}
//       <div className="flex justify-between items-center text-xs">
//         <span className="text-muted">{dummy.length} Leads</span>
//         <button className="border border-border px-2 py-1 rounded-md hover:border-primary">
//           Export CSV
//         </button>
//       </div>

//       {/* LIST */}
//       <div className="flex-1 overflow-y-auto pe-1 scrollbar-thin flex flex-col gap-2">
//         {dummy.map((_, i) => (
//           <EmailItem
//             key={i}
//             subject={`Potential Client ${i + 1}`}
//             sender="lead@mail.com"
//             tag="important"
//             sellScore={80 - i * 5}
//           />
//         ))}
//       </div>
//     </div>
//   );
// }
