import { NextResponse } from "next/server";
import { emailService } from "@/lib/services/emailService";

// GET /api/ready-to-send
export async function GET() {
    // موقتاً user ثابت برای DEV
    const user = { id: "2e069b72-ad0b-4f6c-b7e5-782572c716d2" };

    try {
        const list = await emailService.readyToSend(user.id);
        return NextResponse.json(list);
    } catch (err) {
        console.error("Error fetching ready-to-send emails:", err);
        return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 });
    }
}




// import { NextRequest, NextResponse } from "next/server";
// import { checkApiKey } from "@/lib/middleware/apiKeyMiddleware";
// import { emailService } from "@/lib/services/emailService";

// export async function GET(req: NextRequest) {
//     const user = await checkApiKey(req);

//     // Type Guard برای جلوگیری از ارور TS
//     if (!user || !("id" in user)) {
//         return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const list = await emailService.readyToSend(user.id);
//     return NextResponse.json(list);
// }
