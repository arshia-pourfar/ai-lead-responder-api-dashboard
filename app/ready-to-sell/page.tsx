"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, DollarSign, Sparkles } from "lucide-react";
import EmailItem from "@/components/email/EmailItem";
import Select from "@/components/ui/Select";
import Stat from "@/components/ui/Stat";
import PageHeader from "@/components/ui/Header";
import SuperLoading from "@/components/ui/SuperLoading";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { filterEmailsByQuery } from "@/lib/utils/filterEmails";

interface Email {
  id: string;
  subject: string;
  sender: string;
  body?: string;
  aiReply?: string;
  sellScore?: number;
}

const SCORE_OPTIONS = [
  { label: "All", value: "all" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const DATE_OPTIONS = [
  { label: "All Time", value: "all" },
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 90 Days", value: "90d" },
];

const SOURCE_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Subject A-Z", value: "subject_asc" },
  { label: "Subject Z-A", value: "subject_desc" },
  { label: "Sender A-Z", value: "sender_asc" },
  { label: "Sender Z-A", value: "sender_desc" },
  { label: "Confidence High-Low", value: "confidence_desc" },
  { label: "Confidence Low-High", value: "confidence_asc" },
];

export default function ReadyToSellPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [score, setScore] = useState("all");
  const [date, setDate] = useState("all");
  const [source, setSource] = useState("newest");

  useEffect(() => {
    const controller = new AbortController();

    const fetchEmails = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({
          category: "important",
          confidence: score,
          date,
          sort: source,
        });
        const res = await fetch(`/api/ready-to-sell?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Failed to fetch ready-to-sell emails");
        }

        const data = await res.json();
        setEmails(Array.isArray(data) ? data : []);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error(err);
        setError("Could not load ready-to-sell emails.");
        setEmails([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchEmails();
    return () => controller.abort();
  }, [score, date, source]);

  const debouncedSearch = useDebouncedValue(search, 250);
  const filteredEmails = useMemo(
    () => filterEmailsByQuery(emails, debouncedSearch),
    [emails, debouncedSearch]
  );

  if (loading) return <SuperLoading variant="list" label="Loading leads" />;

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
          <Select label="Score" value={score} options={SCORE_OPTIONS} onChange={setScore} />
          <Select label="Date" value={date} options={DATE_OPTIONS} onChange={setDate} />
          <Select label="Source" value={source} options={SOURCE_OPTIONS} onChange={setSource} />
        </div>
      </div>

      <div className="flex gap-3 text-xs">
        <Stat label="Hot Leads" value={emails.length} color="text-red-500" />
      </div>

      <div className="flex-1 overflow-y-auto pe-1 scrollbar-thin flex flex-col gap-2">
        {error && <p className="text-xs text-danger">{error}</p>}
        {filteredEmails.map((email) => (
          <EmailItem
            key={email.id}
            id={email.id}
            subject={email.subject}
            sender={email.sender}
            body={email.body || ""}
            aiReply={email.aiReply || ""}
            tag="important"
            onSelect={() => setSelectedEmail(email)}
          />
        ))}
        {!error && filteredEmails.length === 0 && <p className="text-xs text-muted">No emails found</p>}
      </div>

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
