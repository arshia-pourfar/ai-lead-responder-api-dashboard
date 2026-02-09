import { NextResponse } from "next/server";
import { readUnreadEmails } from "@/lib/services/readEmail";

export async function GET() {
    try {
        const emails = await readUnreadEmails(10);

        const formatted = emails.map((e, i) => ({
            id: i.toString(),
            subject: e.subject,
            sender: e.name || e.from,
            body: e.text,
            // body: e.body,
            // aiReply: e.aiReply,
            // accountId: e.accountId,
            // createdAt: e.createdAt,
            tag: "unread"
        }));

        return NextResponse.json(formatted);
    } catch (err) {
        console.error(err);
        return NextResponse.json([]);
    }
}
