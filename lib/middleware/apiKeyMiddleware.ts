import { NextRequest, NextResponse } from "next/server";
import { authUser } from "./authMiddleware";

export async function checkApiKey(req: NextRequest) {
    const apiKey = req.headers.get("x-api-key");

    const user = await authUser(apiKey);
    if (!user) {
        return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });
    }

    return user;
}
