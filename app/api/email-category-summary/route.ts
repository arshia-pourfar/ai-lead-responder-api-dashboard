import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authGuard } from "@/lib/middleware/authMiddleware";

export const dynamic = "force-dynamic";

const CATEGORY_COLORS = [
    "#0D9488",
    "#3B82F6",
    "#F59E0B",
    "#EF4444",
    "#6366F1",
    "#10B981",
];

export async function GET(req: NextRequest) {
    const user = authGuard(req);
    if (!user || typeof user !== "object" || !("id" in user)) {
        return NextResponse.json([], { status: 401 });
    }

    try {
        const grouped = await prisma.email.groupBy({
            by: ["category"],
            where: { userId: user.id },
            _count: { category: true },
            orderBy: { _count: { category: "desc" } },
        });

        const response = grouped.map((row, index) => ({
            name: row.category || "unknown",
            value: row._count.category,
            color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        }));

        return NextResponse.json(response, { status: 200 });
    } catch (error) {
        console.error("EMAIL CATEGORY SUMMARY ERROR:", error);
        return NextResponse.json([], { status: 500 });
    }
}
