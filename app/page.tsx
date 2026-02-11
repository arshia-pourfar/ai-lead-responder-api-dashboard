"use client";

import { useEffect, useState } from "react";
import EmailItem from "@/components/email/EmailItem";
import PageHeader from "@/components/ui/Header";
import Card from "@/components/ui/Card";

interface Email {
  id: string;
  subject: string;
  sender: string;
  body: string;
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

  // ایمیلی که برای مشاهده مودال انتخاب شده
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [readyRes, sellRes, unreadRes, sentRes] = await Promise.all([
          fetch("/api/ready-to-send", { credentials: "include" }),
          fetch("/api/ready-to-sell", { credentials: "include" }),
          fetch("/api/unread-emails?limit=10", { credentials: "include" }),
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
    <div className="h-full flex flex-col gap-3 overflow-auto relative">
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
          title="Ready To Send"
          emails={readyEmails}
          tag="ready"
          onSelectEmail={setSelectedEmail}
        />
        <SectionCard
          title="Unread Emails"
          emails={unreadEmails}
          tag="unread"
          onSelectEmail={setSelectedEmail}
        />
        <SectionCard
          title="Sent Emails"
          emails={sentEmails}
          tag="sent"
          onSelectEmail={setSelectedEmail}
        />
        <SectionCard
          title="Important / Sell"
          emails={sellEmails}
          tag="important"
          onSelectEmail={setSelectedEmail}
        />
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

function SectionCard({
  title,
  emails,
  onSelectEmail,
}: {
  title: string;
  tag: "ready" | "unread" | "sent" | "important";
  emails: Email[];
  onSelectEmail: (email: Email) => void;
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
        emails.map((email) => (
          <EmailItem
            key={email.id}
            id={email.id}
            subject={email.subject || "No Subject"}
            sender={email.sender || "unknown"}
            body={email.body || "No content"}
            aiReply={email.aiReply || ""}
            tag={email.tag ?? "ready"}
            onSelect={() => onSelectEmail(email)}
          />
        ))
      ) : (
        <p className="text-xs text-muted">No emails found</p>
      )}
    </Card>
  );
}
