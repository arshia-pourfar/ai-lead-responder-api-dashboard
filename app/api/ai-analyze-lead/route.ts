// pages/api/ai-analyze-lead/route.ts
import { NextRequest, NextResponse } from "next/server";
import { analyzeLead } from "@/lib/services/gemini";
import { authGuard } from "@/lib/middleware/authMiddleware";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { category, message } = body;
        const user = authGuard(req);
        const userId =
            user && typeof user === "object" && "id" in user ? String(user.id) : undefined;

        if (!message) return NextResponse.json({ reply: "No message provided" }, { status: 400 });

        const result = await analyzeLead(category || "support", message, userId);

        return NextResponse.json(result);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ reply: "Failed to generate AI reply" }, { status: 500 });
    }
}
