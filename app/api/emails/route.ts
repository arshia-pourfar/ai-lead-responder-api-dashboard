import { NextRequest, NextResponse } from "next/server";
import { checkApiKey } from "@/lib/middleware/apiKeyMiddleware";
import { emailService, EmailCreateInput } from "@/lib/services/emailService";

export async function GET(req: NextRequest) {
    const user = await checkApiKey(req);
    if (!user || !("id" in user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const emails = await emailService.getAll(user.id);
    return NextResponse.json(emails);
}

export async function POST(req: NextRequest) {
    const user = await checkApiKey(req);
    if (!user || !("id" in user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: Omit<EmailCreateInput, "userId"> = await req.json();

    const email = await emailService.create({
        ...body,
        userId: user.id,
    });

    return NextResponse.json(email);
}
