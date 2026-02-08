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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const readyRes = await fetch("/api/ready-to-send");
        const sellRes = await fetch("/api/ready-to-sell");

        const readyData = await readyRes.json();
        const sellData = await sellRes.json();

        setReadyEmails(Array.isArray(readyData) ? readyData : []);
        setSellEmails(Array.isArray(sellData) ? sellData : []);
      } catch (err) {
        console.error(err);
        setReadyEmails([]);
        setSellEmails([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="h-full flex flex-col gap-3 overflow-auto">
      <PageHeader
        title="Dashboard"
        subtitle="AI Email Overview"
        stats={[
          { label: "Ready Emails", value: readyEmails.length },
          { label: "Sell Emails", value: sellEmails.length },
        ]}
      />

      <div className="grid grid-cols-2 grid-rows-2 gap-3 flex-1 overflow-hidden">
        <SectionCard
          link="/ready-to-send"
          title="Ready To Send"
          emails={readyEmails}
          tag="ready"
        />
        <SectionCard title="Unread Emails" count={28} tag="unread" />
        <SectionCard title="Sent Emails" count={140} tag="sent" />
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
  count,
}: {
  title: string;
  tag: "ready" | "unread" | "sent" | "important";
  link?: string;
  emails?: Email[];
  count?: number;
}) {
  const displayCount = count ?? emails?.length ?? 0;

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
          href={link ?? "/"}
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
            : undefined
      }
    >
      {emails && emails.length > 0 ? (
        emails.map((email) => (
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




// "use client";

// import Card from "@/components/ui/Card";
// import EmailItem from "@/components/email/EmailItem";
// import PageHeader from "@/components/ui/Header";

// const dummy = Array.from({ length: 6 });

// export default function Dashboard() {
//   return (
//     <div className="h-full flex flex-col gap-3 overflow-auto">

//       {/* HEADER */}
//       <PageHeader
//         title="Dashboard"
//         subtitle="AI Email Overview"
//         // می‌تونی stats اینجا اضافه کنی، مثلا:
//         stats={[{ label: 'Total Emails', value: 200 }, { label: 'Unread', value: 28 }]}
//       />

//       {/* GRID */}
//       <div className="grid grid-cols-2 grid-rows-2 gap-3 flex-1 overflow-hidden">
//         <SectionCard link="/ready-to-send" title="Ready To Send" count={12} tag="ready" />
//         <SectionCard title="Unread Emails" count={28} tag="unread" />
//         <SectionCard title="Sent Emails" count={140} tag="sent" />
//         <SectionCard link="/ready-to-sell" title="Important / Sell" count={7} tag="important" />
//       </div>
//     </div>
//   );
// }

// function SectionCard({
//   title,
//   count,
//   tag,
//   link,
// }: {
//   title: string;
//   count: number;
//   tag: "ready" | "unread" | "sent" | "important";
//   link?: string;
// }) {
//   return (
//     <Card
//       title={
//         <div className="flex items-center gap-2">
//           <h3 className="font-semibold text-sm">{title}</h3>
//           <span className="text-xs border border-border px-2 py-0.5 rounded-md text-muted font-medium">
//             {count}
//           </span>
//         </div>
//       }
//       actions={
//         <a href={link ? link : '/'} className={`${link ? '' : 'hidden'} text-sm text-primary hover:underline`}>
//           View All
//         </a>
//       }
//       footer={
//         tag === "ready"
//           ? "AI suggested replies waiting confirmation"
//           : tag === "unread"
//             ? "AI will auto categorize"
//             : undefined
//       }
//     >
//       {dummy.map((_, i) => (
//         <EmailItem
//           key={i}
//           subject={`${title} ${i + 1}`}
//           sender="example@mail.com"
//           tag={tag}
//           sellScore={tag === "important" ? 87 : undefined}
//         />
//       ))}
//     </Card>
//   );
// }
