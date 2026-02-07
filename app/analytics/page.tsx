"use client";

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

const categoryData = [
    { name: "Hot", value: 3, color: "#ef4444" },
    { name: "Warm", value: 4, color: "#3b82f6" },
    { name: "Cold", value: 3, color: "#6b7280" },
];

const salesData = [
    { month: "Jan", sales: 4200 },
    { month: "Feb", sales: 3800 },
    { month: "Mar", sales: 5000 },
    { month: "Apr", sales: 4700 },
];

type TagType = "ready" | "unread" | "sent" | "important";

const soldEmails: { subject: string; sender: string; tag: TagType; sellScore: number }[] = [
    { subject: "Client A", sender: "a@mail.com", tag: "important", sellScore: 87 },
    { subject: "Client B", sender: "b@mail.com", tag: "important", sellScore: 75 },
    { subject: "Client C", sender: "c@mail.com", tag: "important", sellScore: 92 },
    { subject: "Client D", sender: "d@mail.com", tag: "important", sellScore: 80 },
    { subject: "Client E", sender: "e@mail.com", tag: "important", sellScore: 88 },
    { subject: "Client F", sender: "f@mail.com", tag: "important", sellScore: 95 },
];

export default function AnalysisPage() {


    return (
        <div className="h-full flex flex-col gap-4 overflow-auto">
            {/* HEADER */}
            <PageHeader
                title="Analysis"
                subtitle="AI Sales & Email Insights"
                stats={[
                    { icon: DollarSign, label: "Total Sales", value: "$24,200", color: "text-success" },
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

            {/* SOLD EMAILS LIST با EmailItem */}
            <div className="border border-border rounded-xl p-4 flex flex-col gap-2">
                <h3 className="font-semibold text-sm mb-2">Sold Emails</h3>
                {soldEmails.map((email, i) => (
                    <div key={i} className="flex flex-col gap-1">
                        <EmailItem
                            subject={email.subject}
                            sender={email.sender}
                            tag={email.tag}
                            sellScore={email.sellScore}
                        />
                    </div>
                ))}
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
