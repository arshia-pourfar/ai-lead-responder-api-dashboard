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
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchJsonSafe = async <T,>(
      url: string,
      fallback: T,
      timeoutMs = 12_000
    ): Promise<{ data: T; ok: boolean; unauthorized: boolean }> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(url, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!res.ok) {
          return { data: fallback, ok: false, unauthorized: res.status === 401 };
        }

        return { data: (await res.json()) as T, ok: true, unauthorized: false };
      } catch {
        return { data: fallback, ok: false, unauthorized: false };
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const fetchAll = async () => {
      const coreSectionsPromise = Promise.all([
        fetchJsonSafe<Email[]>("/api/ready-to-send", []),
        fetchJsonSafe<Email[]>("/api/ready-to-sell", []),
        fetchJsonSafe<Email[]>("/api/sent-emails", []),
      ]);

      const unreadPromise = fetchJsonSafe<{ emails?: Email[]; total?: number }>(
        "/api/unread-emails?limit=12&offset=0",
        { emails: [] },
        8_000
      );

      const [readyResult, sellResult, sentResult] = await coreSectionsPromise;
      if (cancelled) return;

      setReadyEmails(Array.isArray(readyResult.data) ? readyResult.data : []);
      setSellEmails(Array.isArray(sellResult.data) ? sellResult.data : []);
      setSentEmails(Array.isArray(sentResult.data) ? sentResult.data : []);

      const failedCoreSections = [
        readyResult.ok ? null : "ready",
        sellResult.ok ? null : "sell",
        sentResult.ok ? null : "sent",
      ].filter(Boolean);

      if (readyResult.unauthorized || sellResult.unauthorized || sentResult.unauthorized) {
        setError("Session expired. Please login again.");
      } else if (failedCoreSections.length > 0) {
        setError("Could not load dashboard sections completely.");
      } else {
        setError(null);
      }

      setLoading(false);

      const unreadResult = await unreadPromise;
      if (cancelled) return;

      setUnreadEmails(Array.isArray(unreadResult.data?.emails) ? unreadResult.data.emails : []);

      if (!unreadResult.ok) {
        setError((prev) => {
          if (prev) return prev;
          if (unreadResult.unauthorized) return "Session expired. Please login again.";
          return "Unread emails are temporarily unavailable.";
        });
      }
    };

    fetchAll().catch(() => {
      if (!cancelled) {
        setError("Could not load dashboard sections completely.");
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

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
      {error && <p className="text-xs text-danger">{error}</p>}
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
