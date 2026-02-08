"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import EmailItem from "@/components/email/EmailItem";
import PageHeader from "@/components/ui/Header";

interface Email {
  id: string;
  subject: string;
  sender: string;
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
    const fetchData = async () => {
      try {
        const [readyRes, sellRes, unreadRes, sentRes] = await Promise.all([
          fetch("/api/ready-to-send", { credentials: "include" }),
          fetch("/api/ready-to-sell", { credentials: "include" }),
          fetch("/api/unread-emails", { credentials: "include" }),
          fetch("/api/sent-emails", { credentials: "include" }),
        ]);


        const readyData = await readyRes.json();
        const sellData = await sellRes.json();
        const unreadData = await unreadRes.json();
        const sentData = await sentRes.json(); // <-- اینو فعال کن

        setReadyEmails(Array.isArray(readyData) ? readyData : []);
        setSellEmails(Array.isArray(sellData) ? sellData : []);
        setUnreadEmails(Array.isArray(unreadData) ? unreadData : []);
        setSentEmails(Array.isArray(sentData) ? sentData : []);
      } catch (err) {
        console.error(err);
        setReadyEmails([]);
        setSellEmails([]);
        setUnreadEmails([]);
        setSentEmails([]);
      } finally {
        setLoading(false);
      }
    };


    fetchData();
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
        <SectionCard
          link="/ready-to-send"
          title="Ready To Send"
          emails={readyEmails}
          tag="ready"
        />

        <SectionCard
          title="Unread Emails"
          emails={unreadEmails}
          tag="unread"
        />

        <SectionCard
          title="Sent Emails"
          emails={sentEmails}
          tag="sent"
        />

        <SectionCard
          link="/ready-to-sell"
          title="Important / Sell"
          emails={sellEmails}
          tag="important"
        />
      </div>
    </div>
  );
}

function SectionCard({
  title,
  tag,
  link,
  emails,
}: {
  title: string;
  tag: "ready" | "unread" | "sent" | "important";
  link?: string;
  emails?: Email[];
}) {
  const displayCount = emails?.length ?? 0;

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{title}</h3>
          <span className="text-xs border border-border px-2 py-0.5 rounded-md text-muted font-medium">
            {displayCount}
          </span>
        </div>
      }
      actions={
        <a
          href={link ?? "#"}
          className={`${link ? "" : "hidden"} text-sm text-primary hover:underline`}
        >
          View All
        </a>
      }
      footer={
        tag === "ready"
          ? "AI suggested replies waiting confirmation"
          : tag === "unread"
            ? "AI will auto categorize"
            : tag === "sent"
              ? "Already sent emails"
              : "High priority leads"
      }
    >
      {emails && emails.length > 0 ? (
        emails.slice(0, 5).map((email) => (
          <EmailItem
            key={email.id}
            subject={email.subject}
            sender={email.sender}
            tag={tag}
            sellScore={tag === "important" ? email.sellScore : undefined}
          />
        ))
      ) : (
        <p className="text-xs text-muted">No emails found</p>
      )}
    </Card>
  );
}