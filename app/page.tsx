"use client";

import { useEffect, useState } from "react";
import { Mail, Send, ShoppingBag, Inbox } from "lucide-react";
import EmailItem from "@/components/email/EmailItem";
import EmailDetailModal, { EmailModalData } from "@/components/email/EmailDetailModal";
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

type TabType = "inbox" | "outbox";

const TABS: { id: TabType; label: string; icon: typeof Inbox }[] = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "outbox", label: "Outbox", icon: Send },
];

export default function Dashboard() {
  const [readyEmails, setReadyEmails] = useState<Email[]>([]);
  const [sellEmails, setSellEmails] = useState<Email[]>([]);
  const [unreadEmails, setUnreadEmails] = useState<Email[]>([]);
  const [sentEmails, setSentEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("inbox");

  useEffect(() => {
    let cancelled = false;

    const fetchJsonSafe = async <T,>(
      url: string,
      fallback: T,
      timeoutMs = 12_000
    ): Promise<{ data: T; ok: boolean; unauthorized: boolean; reason?: string }> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(url, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          const reason =
            payload && typeof payload === "object" && "error" in payload
              ? String((payload as { error?: string }).error || `HTTP ${res.status}`)
              : `HTTP ${res.status}`;
          return { data: fallback, ok: false, unauthorized: res.status === 401, reason };
        }

        return { data: (await res.json()) as T, ok: true, unauthorized: false };
      } catch (error) {
        return {
          data: fallback,
          ok: false,
          unauthorized: false,
          reason: error instanceof Error ? error.message : "Request failed",
        };
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const fetchAll = async () => {
      const readyResult = await fetchJsonSafe<Email[]>("/api/ready-to-send", []);
      const sellResult = await fetchJsonSafe<Email[]>("/api/ready-to-sell", []);
      const sentResult = await fetchJsonSafe<Email[]>("/api/sent-emails", []);
      const unreadResult = await fetchJsonSafe<{ emails?: Email[]; total?: number; warning?: string }>(
        "/api/unread-emails?limit=12&offset=0",
        { emails: [] },
        10_000
      );
      if (cancelled) return;

      setReadyEmails(Array.isArray(readyResult.data) ? readyResult.data : []);
      setSellEmails(Array.isArray(sellResult.data) ? sellResult.data : []);
      setSentEmails(Array.isArray(sentResult.data) ? sentResult.data : []);

      const failedCoreSections = [
        readyResult.ok ? null : `ready${readyResult.reason ? ` (${readyResult.reason})` : ""}`,
        sellResult.ok ? null : `sell${sellResult.reason ? ` (${sellResult.reason})` : ""}`,
        sentResult.ok ? null : `sent${sentResult.reason ? ` (${sentResult.reason})` : ""}`,
      ].filter((value): value is string => Boolean(value));

      if (readyResult.unauthorized || sellResult.unauthorized || sentResult.unauthorized) {
        setError("Session expired. Please login again.");
      } else if (failedCoreSections.length > 0) {
        setError(`Could not load dashboard sections completely: ${failedCoreSections.join(" | ")}`);
      } else {
        setError(null);
      }

      setLoading(false);

      setUnreadEmails(Array.isArray(unreadResult.data?.emails) ? unreadResult.data.emails : []);

      if (!unreadResult.ok) {
        setError((prev) => {
          if (prev) return prev;
          if (unreadResult.unauthorized) return "Session expired. Please login again.";
          return `Unread emails are temporarily unavailable${unreadResult.reason ? ` (${unreadResult.reason})` : ""}.`;
        });
      } else if (typeof unreadResult.data?.warning === "string" && unreadResult.data.warning.trim()) {
        setError((prev) => prev || unreadResult.data.warning || null);
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
        bodyHtml: email.bodyHtml || "",
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
          bodyHtml: readyEmail.bodyHtml || "",
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
        bodyHtml: email.bodyHtml || "",
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

  const inboxCounts = { unread: unreadEmails.length, ready: readyEmails.length };
  const outboxCounts = { sent: sentEmails.length, important: sellEmails.length };

  return (
    <div className="relative flex h-full min-w-0 flex-col gap-4 overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">AI Email Overview</p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const counts = tab.id === "inbox" ? inboxCounts : outboxCounts;
            const total = Object.values(counts).reduce((a, b) => a + b, 0);

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted hover:bg-border/40 hover:text-text"
                }`}
              >
                <Icon size={16} />
                {tab.label}
                <span
                  className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-border/60 text-muted"
                  }`}
                >
                  {total}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Inbox} label="Unread" value={unreadEmails.length} accent="tag-unread" />
        <StatCard icon={Send} label="Ready to Send" value={readyEmails.length} accent="primary" />
        <StatCard icon={Mail} label="Sent" value={sentEmails.length} accent="tag-sent" />
        <StatCard icon={ShoppingBag} label="Important" value={sellEmails.length} accent="tag-important" />
      </div>

      {activeTab === "inbox" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-card shadow-sm md:min-h-0">
            <SectionHeader icon={Inbox} label="Unread Emails" count={inboxCounts.unread} accent="tag-unread" />
            <div className="scrollbar-thin flex-1 overflow-y-auto p-3 min-h-0">
              {unreadEmails.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {unreadEmails.map(email => (
                    <EmailItem
                      key={email.id}
                      id={email.id}
                      subject={email.subject || "No Subject"}
                      sender={email.sender || "unknown"}
                      body={email.body || "No content"}
                      bodyHtml={email.bodyHtml || ""}
                      aiReply={email.aiReply || ""}
                      manualReply={email.manualReply || ""}
                      tag="unread"
                      onSelect={() => setSelectedEmail(email)}
                      onUpdateEmail={updateEmail}
                      onRemoveEmail={removeUnreadEmail}
                      onMoveToReady={moveUnreadToReady}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState icon={Inbox} label="No unread emails" />
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-card shadow-sm md:min-h-0">
            <SectionHeader icon={Send} label="Ready to Send" count={inboxCounts.ready} accent="primary" />
            <div className="scrollbar-thin flex-1 overflow-y-auto p-3 min-h-0">
              {readyEmails.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {readyEmails.map(email => (
                    <EmailItem
                      key={email.id}
                      id={email.id}
                      subject={email.subject || "No Subject"}
                      sender={email.sender || "unknown"}
                      body={email.body || "No content"}
                      bodyHtml={email.bodyHtml || ""}
                      aiReply={email.aiReply || ""}
                      manualReply={email.manualReply || ""}
                      tag="ready"
                      onSelect={() => setSelectedEmail(email)}
                      onUpdateEmail={updateEmail}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState icon={Send} label="No ready emails" />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-card shadow-sm md:min-h-0">
            <SectionHeader icon={Mail} label="Sent Emails" count={outboxCounts.sent} accent="tag-sent" />
            <div className="scrollbar-thin flex-1 overflow-y-auto p-3 min-h-0">
              {sentEmails.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {sentEmails.map(email => (
                    <EmailItem
                      key={email.id}
                      id={email.id}
                      subject={email.subject || "No Subject"}
                      sender={email.sender || "unknown"}
                      body={email.body || "No content"}
                      bodyHtml={email.bodyHtml || ""}
                      aiReply={email.aiReply || ""}
                      manualReply={email.manualReply || ""}
                      tag="sent"
                      onSelect={() => setSelectedEmail(email)}
                      onUpdateEmail={updateEmail}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState icon={Mail} label="No sent emails" />
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-card shadow-sm md:min-h-0">
            <SectionHeader icon={ShoppingBag} label="Important / Sell" count={outboxCounts.important} accent="tag-important" />
            <div className="scrollbar-thin flex-1 overflow-y-auto p-3 min-h-0">
              {sellEmails.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {sellEmails.map(email => (
                    <EmailItem
                      key={email.id}
                      id={email.id}
                      subject={email.subject || "No Subject"}
                      sender={email.sender || "unknown"}
                      body={email.body || "No content"}
                      bodyHtml={email.bodyHtml || ""}
                      aiReply={email.aiReply || ""}
                      manualReply={email.manualReply || ""}
                      tag="important"
                      onSelect={() => setSelectedEmail(email)}
                      onUpdateEmail={updateEmail}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState icon={ShoppingBag} label="No important emails" />
              )}
            </div>
          </div>
        </div>
      )}

      <EmailDetailModal
        email={selectedEmail}
        onClose={() => setSelectedEmail(null)}
        onEdit={saveFromModal}
        onSend={sendFromModal}
      />
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  label,
  count,
  accent,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  count: number;
  accent: string;
}) {
  const colorMap: Record<string, string> = {
    "primary": "bg-primary/10 text-primary",
    "tag-unread": "bg-tag-unread/10 text-tag-unread",
    "tag-sent": "bg-tag-sent/10 text-tag-sent",
    "tag-important": "bg-tag-important/10 text-tag-important",
  };

  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-2.5">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${colorMap[accent] || "bg-primary/10 text-primary"}`}>
          <Icon size={14} />
        </div>
        <h3 className="text-sm font-semibold text-text">{label}</h3>
      </div>
      <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-border/50 px-2 text-xs font-medium text-muted">
        {count}
      </span>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
}) {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-muted">
      <Icon size={32} className="opacity-30" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  accent: string;
}) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    "tag-unread": "bg-tag-unread/10 text-tag-unread",
    "tag-sent": "bg-tag-sent/10 text-tag-sent",
    "tag-important": "bg-tag-important/10 text-tag-important",
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-primary/30">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colorMap[accent] || "bg-primary/10 text-primary"}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-text">{value}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}
