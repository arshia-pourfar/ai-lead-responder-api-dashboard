// pages/api/ai-analyze-lead.ts
import { NextRequest, NextResponse } from "next/server";
import { analyzeLead } from "@/lib/services/gemini";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { category, message } = body;

        if (!message) return NextResponse.json({ reply: "No message provided" }, { status: 400 });

        const result = await analyzeLead(category || "support", message);

        return NextResponse.json(result);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ reply: "Failed to generate AI reply" }, { status: 500 });
    }
}
