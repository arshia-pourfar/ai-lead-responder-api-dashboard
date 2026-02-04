"use client";

import Card from "@/components/ui/Card";
import EmailItem from "@/components/email/EmailItem";

const dummy = Array.from({ length: 6 });

export default function Dashboard() {
  return (
    <div className="h-full flex flex-col gap-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-xs text-muted">AI Email Overview</p>
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-2 grid-rows-2 gap-4 flex-1 overflow-hidden">
        <SectionCard title="Ready To Send" count={12} tag="ready" showConfirm />
        <SectionCard title="Unread Emails" count={28} tag="unread" />
        <SectionCard title="Sent Emails" count={140} tag="sent" />
        <SectionCard title="Important / Sell" count={7} tag="important" />
      </div>
    </div>
  );
}

function SectionCard({
  title,
  count,
  tag,
  showConfirm = false,
}: {
  title: string;
  count: number;
  tag: "ready" | "unread" | "sent" | "important";
  showConfirm?: boolean;
}) {
  return (
    <Card
      title={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{title}</h3>
            <span className="text-xs border border-border px-2 py-0.5 rounded-md text-muted">
              {count}
            </span>
          </div>
          <button className="text-xs text-primary hover:underline">View All</button>
        </div>
      }
    >
      {dummy.map((_, i) => (
        <EmailItem
          key={i}
          subject={`${title} ${i + 1}`}
          sender="example@mail.com"
          tag={tag}
          showConfirm={showConfirm}
        />
      ))}
    </Card>
  );
}
