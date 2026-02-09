"use client";

import { useEffect, useState } from "react";
import EmailItem from "@/components/email/EmailItem";
import PageHeader from "@/components/ui/Header";
import Card from "@/components/ui/Card";

interface Email {
  id: string;
  subject: string;
  sender: string;
  body?: string;
  aiReply?: string;
  tag?: "ready" | "unread" | "sent" | "important";
  sellScore?: number;
}

export default function Dashboard() {
  const [readyEmails, setReadyEmails] = useState<Email[]>([]);
  const [sellEmails, setSellEmails] = useState<Email[]>([]);
  const [unreadEmails, setUnreadEmails] = useState<Email[]>([]);
  const [sentEmails, setSentEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [readyRes, sellRes, unreadRes, sentRes] = await Promise.all([
          fetch("/api/ready-to-send", { credentials: "include" }),
          fetch("/api/ready-to-sell", { credentials: "include" }),
          fetch("/api/unread-emails", { credentials: "include" }),
          fetch("/api/sent-emails", { credentials: "include" }),
        ]);

        setReadyEmails(await readyRes.json());
        setSellEmails(await sellRes.json());
        setUnreadEmails(await unreadRes.json());
        setSentEmails(await sentRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  if (loading) return <p className="p-4 text-sm">Loading...</p>;

  return (
    <div className="h-full flex flex-col gap-3 overflow-auto">
      <PageHeader
        title="Dashboard"
        subtitle="AI Email Overview"
        stats={[
          { label: "Ready Emails", value: readyEmails.length },
          { label: "Unread", value: unreadEmails.length },
          { label: "Sent", value: sentEmails.length },
          { label: "Sell", value: sellEmails.length },
        ]}
      />
      <div className="grid grid-cols-2 grid-rows-2 gap-3 flex-1 overflow-hidden">
        <SectionCard title="Ready To Send" emails={readyEmails} tag="ready" />
        <SectionCard title="Unread Emails" emails={unreadEmails} tag="unread" />
        <SectionCard title="Sent Emails" emails={sentEmails} tag="sent" />
        <SectionCard title="Important / Sell" emails={sellEmails} tag="important" />
      </div>
    </div>
  );
}

function SectionCard({
  title,
  emails,
}: {
  title: string;
  tag: "ready" | "unread" | "sent" | "important";
  emails: Email[];
}) {
  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{title}</h3>
          <span className="text-xs border border-border px-2 py-0.5 rounded-md text-muted font-medium">
            {emails.length}
          </span>
        </div>
      }
    >
      {emails.length > 0 ? (
        emails.slice(0, 5).map((email) => (
          <EmailItem
            key={email.id}
            {...email}
            tag={email.tag ?? "ready"}  // اگر tag undefined بود، پیش‌فرض
            body={email.body ?? "No content"} // مهم! اگر body undefined بود، مقدار پیش‌فرض بده
            aiReply={email.aiReply ?? ""}    // اختیاری، اما بهتره همیشه رشته باشه
          />
        ))
      ) : (
        <p className="text-xs text-muted">No emails found</p>
      )}
    </Card>
  );
}
