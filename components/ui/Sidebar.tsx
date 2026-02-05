"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Send,
    ShoppingBag,
    BarChart3,
    Mail,
    Settings,
} from "lucide-react";

const items = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/ready-to-send", label: "Ready To Send", icon: Send },
    { href: "/ready-to-sell", label: "Ready To Sell", icon: ShoppingBag },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function Sidebar() {
    const path = usePathname();

    return (
        <aside className="w-64 bg-card border-r border-border flex flex-col p-4">
            {/* LOGO / HEADER */}
            <div className="flex items-center gap-2 mb-8 px-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Mail size={18} />
                </div>
                <h1 className="text-lg font-semibold text-text">AI Mail</h1>
            </div>

            {/* NAV */}
            <nav className="flex flex-col gap-1">
                {items.map((item) => {
                    const Icon = item.icon;
                    const active = path === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                                flex items-center gap-3 px-3 py-2.5 rounded-xl
                                transition-all duration-150
                                border
                                ${active
                                    ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
                                    : "border-transparent text-muted hover:bg-border/40 hover:text-text"
                                }
                            `}
                        >
                            <Icon size={18} />
                            <span className="text-sm font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* SETTINGS */}
            <div className="mt-auto">
                {(() => {
                    const active = path === "/settings";
                    return (
                        <Link
                            href="/settings"
                            className={`
                                flex items-center gap-3 px-3 py-2.5 rounded-xl
                                transition-all duration-150
                                border
                                ${active
                                    ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
                                    : "border-transparent text-muted hover:bg-border/40 hover:text-text"
                                }
                            `}
                        >
                            <Settings size={18} />
                            <span className="text-sm font-medium">Settings</span>
                        </Link>
                    );
                })()}

                {/* FOOTER */}
                <div className="pt-6 text-xs text-muted px-2">
                    v1.0 AI Panel
                </div>
            </div>
        </aside>
    );
}
