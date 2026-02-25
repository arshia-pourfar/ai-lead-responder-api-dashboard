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
import PageHeader from "@/components/ui/Header";
import EmailItem from "@/components/email/EmailItem";
import { Check, DollarSign } from "lucide-react";
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

    if (loading) return <SuperLoading variant="analytics" label="Preparing analytics" />;

    // تابع برای اطلاع دادن به داشبورد هنگام کلیک روی چشم
    const handleSelectEmail = (emailId: string) => {
        console.log("Selected email:", emailId);
        // می‌توانی اینجا state یا context داشبورد رو آپدیت کنی
    };

    return (
        <div className="flex h-full min-w-0 flex-col gap-4 overflow-auto">
            {/* HEADER */}
            <PageHeader
                title="Analysis"
                subtitle="AI Sales & Email Insights"
                stats={[
                    { icon: DollarSign, label: "Total Sales", value: `$${totalSales}`, color: "text-success" },
                    { icon: Check, label: "Confirmed Emails", value: soldEmails.length, color: "text-primary" },
                    { icon: DollarSign, label: "Avg / Month", value: `$${averageMonthlySales}`, color: "text-warning" },
                ]}
            />
            {error && <p className="text-xs text-danger">{error}</p>}

            {/* CHARTS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* PIE CHART */}
                <div className="min-w-0 border border-border rounded-xl p-4 flex flex-col gap-2">
                    <h3 className="font-semibold text-sm mb-2">Leads by Category</h3>
                    <div className="w-full h-48">
                        {categoryData.length > 0 ? (
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={70}
                                        label
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={index} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Legend />
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-xs text-muted">No category data</p>
                        )}
                    </div>
                </div>

                {/* SALES BAR CHART */}
                <div className="min-w-0 border border-border rounded-xl p-4 flex flex-col gap-2">
                    <h3 className="font-semibold text-sm mb-2">Sales Over Time</h3>
                    <div className="w-full h-48">
                        {salesData.length > 0 ? (
                            <ResponsiveContainer>
                                <BarChart data={salesData}>
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="sales" fill="#3b82f6" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-xs text-muted">No monthly sales data</p>
                        )}
                    </div>
                </div>
            </div>

            {/* SOLD EMAILS LIST */}
            <div className="min-h-0 border border-border rounded-xl p-4 flex flex-col gap-2">
                <h3 className="font-semibold text-sm mb-2">Sold Emails</h3>
                <div className="max-h-[45vh] overflow-y-auto pe-1 scrollbar-thin">
                    {soldEmails.length > 0 ? (
                        soldEmails.map((email) => (
                            <EmailItem
                                key={email.id}
                                id={email.id}
                                subject={email.subject}
                                sender={email.sender}
                                body={email.body || "No body available"}
                                bodyHtml={email.bodyHtml || ""}
                                tag="important"
                                onSelect={() => handleSelectEmail(email.id)}
                            />
                        ))
                    ) : (
                        <p className="text-xs text-muted">No sold emails found</p>
                    )}
                </div>

            </div>

            {/* FUTURE AI ANALYSIS */}
            <div className="border border-border rounded-xl p-4 text-center text-sm text-muted">
                AI Analysis Program (Coming Soon)
                <p className="mt-1 text-xs">
                    This section will analyze all data and provide insights once the program is available.
                </p>
            </div>
        </div>
    );
}
