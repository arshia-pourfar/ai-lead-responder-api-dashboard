"use client";

import { useEffect, useMemo, useState } from "react";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
} from "recharts";
import { DollarSign, Check, BarChart3, ShoppingBag, TrendingUp } from "lucide-react";
import EmailItem from "@/components/email/EmailItem";
import SuperLoading from "@/components/ui/SuperLoading";

interface SoldEmail {
    id: string;
    subject: string;
    sender: string;
    body?: string;
    bodyHtml?: string;
    aiReply?: string;
    tag: "important";
    sellScore?: number;
}

interface CategoryData {
    name: string;
    value: number;
    color: string;
}

interface SalesData {
    month: string;
    sales: number;
}

export default function AnalysisPage() {
    const [soldEmails, setSoldEmails] = useState<SoldEmail[]>([]);
    const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
    const [salesData, setSalesData] = useState<SalesData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        const fetchJsonSafe = async <T,>(
            url: string,
            fallback: T
        ): Promise<{ data: T; ok: boolean }> => {
            try {
                const res = await fetch(url, {
                    credentials: "include",
                    cache: "no-store",
                    signal: controller.signal,
                });
                if (!res.ok) return { data: fallback, ok: false };
                return { data: (await res.json()) as T, ok: true };
            } catch {
                return { data: fallback, ok: false };
            }
        };

        const fetchData = async () => {
            const [soldResult, categoryResult, salesResult] = await Promise.all([
                fetchJsonSafe<SoldEmail[]>("/api/ready-to-sell", []),
                fetchJsonSafe<CategoryData[]>("/api/email-category-summary", []),
                fetchJsonSafe<SalesData[]>("/api/sales-summary", []),
            ]);

            if (controller.signal.aborted) return;

            setSoldEmails(Array.isArray(soldResult.data) ? soldResult.data : []);
            setCategoryData(Array.isArray(categoryResult.data) ? categoryResult.data : []);
            setSalesData(Array.isArray(salesResult.data) ? salesResult.data : []);

            const hasFailedRequest = !soldResult.ok || !categoryResult.ok || !salesResult.ok;
            setError(hasFailedRequest ? "Analytics data is partially unavailable." : null);
            setLoading(false);
        };

        fetchData().catch((err) => {
            if ((err as Error).name === "AbortError") return;
            console.error(err);
            if (!controller.signal.aborted) {
                setError("Could not load analytics data.");
                setSoldEmails([]);
                setCategoryData([]);
                setSalesData([]);
                setLoading(false);
            }
        });

        return () => controller.abort();
    }, []);

    const totalSales = useMemo(() => {
        const chartBasedTotal = salesData.reduce((sum, item) => sum + item.sales, 0);
        if (chartBasedTotal > 0) return chartBasedTotal;
        return soldEmails.length * 50;
    }, [salesData, soldEmails.length]);

    const averageMonthlySales = useMemo(() => {
        if (salesData.length === 0) return 0;
        const total = salesData.reduce((sum, item) => sum + item.sales, 0);
        return Math.round(total / salesData.length);
    }, [salesData]);

    const totalCategories = useMemo(() => {
        return categoryData.reduce((sum, item) => sum + item.value, 0);
    }, [categoryData]);

    if (loading) return <SuperLoading variant="analytics" label="Preparing analytics" />;

    return (
        <div className="flex h-full min-w-0 flex-col gap-4 overflow-auto">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-text">Analytics</h1>
                    <p className="mt-1 text-sm text-muted">AI Sales & Email Insights</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard icon={DollarSign} label="Total Sales" value={`$${totalSales}`} accent="primary" />
                <StatCard icon={Check} label="Confirmed" value={soldEmails.length} accent="tag-unread" />
                <StatCard icon={TrendingUp} label="Avg / Month" value={`$${averageMonthlySales}`} accent="tag-sent" />
                <StatCard icon={ShoppingBag} label="Categories" value={totalCategories} accent="tag-important" />
            </div>

            {/* Error */}
            {error && (
                <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                    {error}
                </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Pie Chart */}
                <div className="rounded-xl border border-border bg-card p-4">
                    <div className="mb-4 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <BarChart3 size={16} />
                        </div>
                        <h3 className="text-sm font-semibold text-text">Leads by Category</h3>
                    </div>
                    <div className="h-64">
                        {categoryData.length > 0 ? (
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        innerRadius={40}
                                        paddingAngle={2}
                                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={index} fill={entry.color} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "var(--card)",
                                            border: "1px solid var(--border)",
                                            borderRadius: "8px",
                                            fontSize: "12px",
                                        }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-muted">
                                <p className="text-sm">No category data</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bar Chart */}
                <div className="rounded-xl border border-border bg-card p-4">
                    <div className="mb-4 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-tag-unread/10 text-tag-unread">
                            <TrendingUp size={16} />
                        </div>
                        <h3 className="text-sm font-semibold text-text">Sales Over Time</h3>
                    </div>
                    <div className="h-64">
                        {salesData.length > 0 ? (
                            <ResponsiveContainer>
                                <BarChart data={salesData}>
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: "var(--muted)" }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: "var(--muted)" }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "var(--card)",
                                            border: "1px solid var(--border)",
                                            borderRadius: "8px",
                                            fontSize: "12px",
                                        }}
                                    />
                                    <Bar
                                        dataKey="sales"
                                        fill="var(--primary)"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-muted">
                                <p className="text-sm">No monthly sales data</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sold Emails List */}
            <div className="rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-tag-important/10 text-tag-important">
                        <ShoppingBag size={16} />
                    </div>
                    <h3 className="text-sm font-semibold text-text">Sold Emails</h3>
                    <span className="ml-auto flex h-6 min-w-[24px] items-center justify-center rounded-full bg-border/50 px-2 text-xs font-medium text-muted">
                        {soldEmails.length}
                    </span>
                </div>
                <div className="scrollbar-thin max-h-[40vh] overflow-y-auto p-3">
                    {soldEmails.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            {soldEmails.map((email) => (
                                <EmailItem
                                    key={email.id}
                                    id={email.id}
                                    subject={email.subject}
                                    sender={email.sender}
                                    body={email.body || "No body available"}
                                    bodyHtml={email.bodyHtml || ""}
                                    tag="important"
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 text-muted">
                            <ShoppingBag size={32} className="opacity-30" />
                            <p className="text-sm">No sold emails found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Coming Soon */}
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <BarChart3 size={24} />
                </div>
                <h4 className="text-sm font-semibold text-text">AI Analysis Coming Soon</h4>
                <p className="mt-1 text-xs text-muted">
                    This section will analyze all data and provide insights once the program is available.
                </p>
            </div>
        </div>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
    accent,
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    value: number | string;
    accent: string;
}) {
    const colorMap: Record<string, string> = {
        primary: "bg-primary/10 text-primary",
        "tag-unread": "bg-tag-unread/10 text-tag-unread",
        "tag-sent": "bg-tag-sent/10 text-tag-sent",
        "tag-important": "bg-tag-important/10 text-tag-important",
    };

    return (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-primary/30">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colorMap[accent] || "bg-primary/10 text-primary"}`}>
                <Icon size={18} />
            </div>
            <div className="min-w-0">
                <p className="text-xl font-bold text-text">{value}</p>
                <p className="text-xs text-muted">{label}</p>
            </div>
        </div>
    );
}
