"use client";

import { useEffect, useState } from "react";
import EmailItem from "@/components/email/EmailItem";
import PageHeader from "@/components/ui/Header";
import Card from "@/components/ui/Card";
import SuperLoading from "@/components/ui/SuperLoading";

interface Email {
  id: string;
  subject: string;
  sender: string;
  body: string;
  aiReply?: string;
  manualReply?: string;
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

  // --- fetch initial emails ---
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [readyRes, sellRes, unreadRes, sentRes] = await Promise.all([
          fetch("/api/ready-to-send", { credentials: "include" }),
          fetch("/api/ready-to-sell", { credentials: "include" }),
          fetch("/api/unread-emails?limit=50", { credentials: "include" }),
          fetch("/api/sent-emails", { credentials: "include" }),
        ]);

        const unreadData = await unreadRes.json();
        setReadyEmails(await readyRes.json());
        setSellEmails(await sellRes.json());
        setUnreadEmails(Array.isArray(unreadData?.emails) ? unreadData.emails : []);
        setSentEmails(await sentRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  // --- تابع برای بروزرسانی ایمیل‌ها ---
  const updateEmail = (id: string, updated: Partial<Email>) => {
    if (updated.tag === "sent") {
      let movedEmail: Email | undefined;

      setReadyEmails(prev => {
        const found = prev.find(email => email.id === id);
        if (found) {
          movedEmail = { ...found, ...updated, tag: "sent" };
        }
        return prev.filter(email => email.id !== id);
      });

      setSentEmails(prev => {
        if (!movedEmail) return prev;
        if (prev.some(email => email.id === id)) {
          return prev.map(email => (email.id === id ? { ...email, ...movedEmail } : email));
        }
        return [movedEmail, ...prev];
      });

      setSelectedEmail(prev => (prev && prev.id === id ? { ...prev, ...updated } : prev));
      return;
    }

    const updateList = (list: Email[]) =>
      list.map(e => (e.id === id ? { ...e, ...updated } : e));

    setReadyEmails(prev => updateList(prev));
    setUnreadEmails(prev => updateList(prev));
    setSentEmails(prev => updateList(prev));
    setSellEmails(prev => updateList(prev));

    setSelectedEmail(prev => (prev && prev.id === id ? { ...prev, ...updated } : prev));
  };

  const removeUnreadEmail = (id: string) => {
    setUnreadEmails(prev => prev.filter(email => email.id !== id));
    setSelectedEmail(prev => (prev && prev.id === id ? null : prev));
  };

  const moveUnreadToReady = (email: Email) => {
    setReadyEmails(prev => {
      if (prev.some(item => item.id === email.id)) return prev;
      return [email, ...prev];
    });
  };

  if (loading) {
    return <SuperLoading variant="dashboard" label="Syncing dashboard" />;
  }

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
          onUpdateEmail={updateEmail}
        />
        <SectionCard
          title="Unread Emails"
          emails={unreadEmails}
          tag="unread"
          onSelectEmail={setSelectedEmail}
          onUpdateEmail={updateEmail}
          onRemoveEmail={removeUnreadEmail}
          onMoveToReady={moveUnreadToReady}
        />
        <SectionCard
          title="Sent Emails"
          emails={sentEmails}
          tag="sent"
          onSelectEmail={setSelectedEmail}
          onUpdateEmail={updateEmail}
        />
        <SectionCard
          title="Important / Sell"
          emails={sellEmails}
          tag="important"
          onSelectEmail={setSelectedEmail}
          onUpdateEmail={updateEmail}
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
            {(selectedEmail.aiReply || selectedEmail.manualReply) && (
              <div className="mt-4 border-t pt-2">
                <p className="font-semibold text-sm">Reply:</p>
                <p className="text-sm text-muted whitespace-pre-line">
                  {selectedEmail.manualReply || selectedEmail.aiReply}
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
  tag,
  emails,
  onSelectEmail,
  onUpdateEmail,
  onRemoveEmail,
  onMoveToReady,
}: {
  title: string;
  tag: "ready" | "unread" | "sent" | "important";
  emails: Email[];
  onSelectEmail: (email: Email) => void;
  onUpdateEmail: (id: string, updated: Partial<Email>) => void;
  onRemoveEmail?: (id: string) => void;
  onMoveToReady?: (email: Email) => void;
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
        emails.map(email => (
          <EmailItem
            key={email.id}
            id={email.id}
            subject={email.subject || "No Subject"}
            sender={email.sender || "unknown"}
            body={email.body || "No content"}
            aiReply={email.aiReply || ""}
            manualReply={email.manualReply || ""}
            tag={email.tag ?? tag}
            onSelect={() => onSelectEmail(email)}
            onUpdateEmail={onUpdateEmail}
            onRemoveEmail={tag === "unread" ? onRemoveEmail : undefined}
            onMoveToReady={tag === "unread" ? onMoveToReady : undefined}
          />
        ))
      ) : (
        <p className="text-xs text-muted">No emails found</p>
      )}
    </Card>
  );
}

