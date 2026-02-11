"use client";

import { useEffect, useState } from "react";
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

interface SoldEmail {
    id: string;
    subject: string;
    sender: string;
    tag: "important";
    sellScore: number;
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

    useEffect(() => {
        const fetchData = async () => {
            try {
                // ایمیل‌های فروخته شده
                const soldRes = await fetch("/api/ready-to-sell");
                const soldData = await soldRes.json();
                setSoldEmails(Array.isArray(soldData) ? soldData : []);

                // دسته‌بندی ایمیل‌ها
                const categoryRes = await fetch("/api/email-category-summary");
                const categorySummary = await categoryRes.json();
                setCategoryData(Array.isArray(categorySummary) ? categorySummary : []);

                // فروش ماهانه
                const salesRes = await fetch("/api/sales-summary");
                const salesSummary = await salesRes.json();
                setSalesData(Array.isArray(salesSummary) ? salesSummary : []);
            } catch (err) {
                console.error(err);
                setSoldEmails([]);
                setCategoryData([]);
                setSalesData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <p>Loading...</p>;

    const totalSales = soldEmails.reduce((acc, email) => acc + (email.sellScore || 0) * 50, 0);

    // تابع برای اطلاع دادن به داشبورد هنگام کلیک روی چشم
    const handleSelectEmail = (emailId: string) => {
        console.log("Selected email:", emailId);
        // می‌توانی اینجا state یا context داشبورد رو آپدیت کنی
    };

    return (
        <div className="h-full flex flex-col gap-4 overflow-auto">
            {/* HEADER */}
            <PageHeader
                title="Analysis"
                subtitle="AI Sales & Email Insights"
                stats={[
                    { icon: DollarSign, label: "Total Sales", value: `$${totalSales}`, color: "text-success" },
                    { icon: Check, label: "Confirmed Emails", value: soldEmails.length, color: "text-primary" },
                ]}
            />

            {/* CHARTS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* PIE CHART */}
                <div className="border border-border rounded-xl p-4 flex flex-col gap-2">
                    <h3 className="font-semibold text-sm mb-2">Leads by Category</h3>
                    <div className="w-full h-48">
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
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* SALES BAR CHART */}
                <div className="border border-border rounded-xl p-4 flex flex-col gap-2">
                    <h3 className="font-semibold text-sm mb-2">Sales Over Time</h3>
                    <div className="w-full h-48">
                        <ResponsiveContainer>
                            <BarChart data={salesData}>
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="sales" fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* SOLD EMAILS LIST */}
            <div className="border border-border rounded-xl p-4 flex flex-col gap-2">
                <h3 className="font-semibold text-sm mb-2">Sold Emails</h3>
                {soldEmails.length > 0 ? (
                    soldEmails.map((email) => (
                        <EmailItem
                            key={email.id}
                            id={email.id}
                            subject={email.subject}
                            sender={email.sender}
                            body={email.subject || "No body available"} // add body
                            tag="important"
                            // sellScore={email.sellScore}
                            onSelect={() => handleSelectEmail(email.id)}
                        />
                    ))
                ) : (
                    <p className="text-xs text-muted">No sold emails found</p>
                )}

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
