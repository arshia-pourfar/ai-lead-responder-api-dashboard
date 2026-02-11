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
  body?: string;
  aiReply?: string;
  sellScore?: number;
}

export default function ReadyToSellPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // ایمیل انتخاب‌شده برای نمایش مودال
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

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
          {
            icon: DollarSign,
            label: "Potential",
            value: `$${emails.reduce((a, b) => a + (b.sellScore || 0) * 50, 0)}`,
            color: "text-success",
          },
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
            id={email.id}
            subject={email.subject}
            sender={email.sender}
            body={email.body || ""}
            aiReply={email.aiReply || ""}
            tag="important"
            // sellScore={email.sellScore}
            onSelect={() => setSelectedEmail(email)} // اینجا وصل شد
          />
        ))}
        {emails.length === 0 && <p className="text-xs text-muted">No emails found</p>}
      </div>

      {/* FULL PAGE MODAL */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-bg w-full h-full max-w-5xl max-h-[90vh] overflow-auto p-6 rounded-xl">
            <h3 className="font-semibold mb-4 text-lg">{selectedEmail.subject}</h3>
            <p className="text-sm text-muted whitespace-pre-line">
              {selectedEmail.body || "No content"}
            </p>
            {selectedEmail.aiReply && (
              <div className="mt-4 border-t pt-2">
                <p className="font-semibold text-sm">AI Reply:</p>
                <p className="text-sm text-muted whitespace-pre-line">
                  {selectedEmail.aiReply}
                </p>
              </div>
            )}
            <button
              onClick={() => setSelectedEmail(null)}
              className="mt-4 px-4 py-2 text-sm border border-border rounded-md hover:border-primary"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
