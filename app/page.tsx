"use client";

import Card from "@/components/ui/Card";
import EmailItem from "@/components/email/EmailItem";
import PageHeader from "@/components/ui/Header";

const dummy = Array.from({ length: 6 });

export default function Dashboard() {
  return (
    <div className="h-full flex flex-col gap-3 overflow-auto">

      {/* HEADER */}
      <PageHeader
        title="Dashboard"
        subtitle="AI Email Overview"
        // می‌تونی stats اینجا اضافه کنی، مثلا:
        stats={[{ label: 'Total Emails', value: 200 }, { label: 'Unread', value: 28 }]}
      />

      {/* GRID */}
      <div className="grid grid-cols-2 grid-rows-2 gap-3 flex-1 overflow-hidden">
        <SectionCard link="/ready-to-send" title="Ready To Send" count={12} tag="ready" />
        <SectionCard title="Unread Emails" count={28} tag="unread" />
        <SectionCard title="Sent Emails" count={140} tag="sent" />
        <SectionCard link="/ready-to-sell" title="Important / Sell" count={7} tag="important" />
      </div>
    </div>
  );
}

function SectionCard({
  title,
  count,
  tag,
  link,
}: {
  title: string;
  count: number;
  tag: "ready" | "unread" | "sent" | "important";
  link?: string;
}) {
  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{title}</h3>
          <span className="text-xs border border-border px-2 py-0.5 rounded-md text-muted font-medium">
            {count}
          </span>
        </div>
      }
      actions={
        <a href={link ? link : '/'} className={`${link ? '' : 'hidden'} text-sm text-primary hover:underline`}>
          View All
        </a>
      }
      footer={
        tag === "ready"
          ? "AI suggested replies waiting confirmation"
          : tag === "unread"
            ? "AI will auto categorize"
            : undefined
      }
    >
      {dummy.map((_, i) => (
        <EmailItem
          key={i}
          subject={`${title} ${i + 1}`}
          sender="example@mail.com"
          tag={tag}
          sellScore={tag === "important" ? 87 : undefined}
        />
      ))}
    </Card>
  );
}
