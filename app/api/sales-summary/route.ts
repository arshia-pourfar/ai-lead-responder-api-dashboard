import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authGuard } from "@/lib/middleware/authMiddleware";

export const dynamic = "force-dynamic";

interface SalesPoint {
    month: string;
    sales: number;
}

function getRecentMonths(count: number): { key: string; label: string }[] {
    const now = new Date();
    const months: { key: string; label: string }[] = [];

    for (let i = count - 1; i >= 0; i -= 1) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        const label = date.toLocaleString("en-US", { month: "short" });
        months.push({ key, label });
    }

    return months;
}

export async function GET(req: NextRequest) {
    const user = authGuard(req);
    if (!user || typeof user !== "object" || !("id" in user)) {
        return NextResponse.json([], { status: 401 });
    }

    try {
        const emails = await prisma.email.findMany({
            where: {
                userId: user.id,
                OR: [{ status: "sent" }, { tag: "sent" }],
            },
            select: { createdAt: true },
        });

        const monthlyCounts = new Map<string, number>();
        for (const email of emails) {
            const monthKey = `${email.createdAt.getFullYear()}-${email.createdAt.getMonth() + 1}`;
            monthlyCounts.set(monthKey, (monthlyCounts.get(monthKey) || 0) + 1);
        }

        const points: SalesPoint[] = getRecentMonths(6).map(({ key, label }) => ({
            month: label,
            sales: (monthlyCounts.get(key) || 0) * 50,
        }));

        return NextResponse.json(points, { status: 200 });
    } catch (error) {
        console.error("SALES SUMMARY ERROR:", error);
        return NextResponse.json([], { status: 500 });
    }
}
