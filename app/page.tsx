"use client";

import { useEffect, useState } from "react";
import EmailItem from "@/components/email/EmailItem";
import EmailDetailModal, { EmailModalData } from "@/components/email/EmailDetailModal";
import PageHeader from "@/components/ui/Header";
import Card from "@/components/ui/Card";
import SuperLoading from "@/components/ui/SuperLoading";

interface Email extends EmailModalData {
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

  const ensureReplyText = async (email: EmailModalData, replyText: string): Promise<string> => {
    const normalized = replyText.trim();
    if (normalized) return normalized;

    const aiRes = await fetch("/api/ai-analyze-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ category: "support", message: email.body || "" }),
    });
    const aiData = await aiRes.json().catch(() => null);
    if (!aiRes.ok) {
      throw new Error(aiData?.error || "Could not generate AI reply");
    }

    const generated = String(aiData?.reply || "").trim();
    if (!generated) {
      throw new Error("Reply text cannot be empty");
    }
    return generated;
  };

  const approveUnreadEmail = async (email: EmailModalData, replyText: string) => {
    const approveRes = await fetch("/api/unread-emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        emailId: email.id,
        subject: email.subject,
        sender: email.sender,
        body: email.body || "",
        text: replyText,
      }),
    });
    const approveData = await approveRes.json().catch(() => null);
    if (!approveRes.ok || !approveData?.readyEmail) {
      throw new Error(approveData?.error || "Failed to approve email");
    }
    return approveData.readyEmail as Email;
  };

  const saveFromModal = async (email: EmailModalData, replyText: string) => {
    if (email.tag === "unread") {
      const finalReply = await ensureReplyText(email, replyText);
      const readyEmail = await approveUnreadEmail(email, finalReply);
      removeUnreadEmail(email.id);
      moveUnreadToReady(readyEmail);
      setSelectedEmail(null);
      return;
    }

    const res = await fetch("/api/ready-to-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        emailId: email.id,
        manualReply: replyText,
        aiReply: replyText,
        saveOnly: true,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || "Save failed");
    }
    updateEmail(email.id, { manualReply: replyText, aiReply: replyText });
  };

  const sendFromModal = async (email: EmailModalData, replyText: string) => {
    if (email.tag === "unread") {
      const finalReply = await ensureReplyText(email, replyText);
      const readyEmail = await approveUnreadEmail(email, finalReply);

      const sendRes = await fetch("/api/ready-to-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          emailId: readyEmail.id,
          subject: readyEmail.subject,
          sender: readyEmail.sender,
          body: readyEmail.body,
          manualReply: finalReply,
          sendNow: true,
        }),
      });
      const sendData = await sendRes.json().catch(() => null);
      if (!sendRes.ok) {
        throw new Error(sendData?.error || "Send failed");
      }

      removeUnreadEmail(email.id);
      setSelectedEmail(null);
      return;
    }

    const res = await fetch("/api/ready-to-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        emailId: email.id,
        subject: email.subject,
        sender: email.sender,
        body: email.body || "",
        manualReply: replyText,
        sendNow: true,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || "Send failed");
    }
    updateEmail(email.id, { manualReply: replyText, aiReply: replyText, tag: "sent" });
    setSelectedEmail(null);
  };

  if (loading) {
    return <SuperLoading variant="dashboard" label="Syncing dashboard" />;
  }

  return (
    <div className="relative flex h-full min-w-0 flex-col gap-3 overflow-auto">
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
      <div className="grid flex-1 min-h-0 grid-cols-1 gap-3 overflow-auto md:grid-cols-2">
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

      <EmailDetailModal
        email={selectedEmail}
        onClose={() => setSelectedEmail(null)}
        onEdit={saveFromModal}
        onSend={sendFromModal}
      />
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
        <div className="flex flex-wrap items-center gap-2">
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
