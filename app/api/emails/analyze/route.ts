import { NextRequest, NextResponse } from "next/server";
import { analyzeEmail } from "@/lib/services/emailService";
import { checkApiKey } from "@/lib/middleware/apiKeyMiddleware";

export async function POST(req: NextRequest) {
    const user = await checkApiKey(req);
    if (!user || !("id" in user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { emailId } = await req.json();

    // توجه: تابع analyzeEmail فقط emailId می‌گیره، userId برای امنیت می‌تونیم تو prisma داخل خودش چک کنیم
    const email = await analyzeEmail(emailId);

    return NextResponse.json(email);
}
