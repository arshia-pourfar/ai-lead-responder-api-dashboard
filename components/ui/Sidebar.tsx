"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import {
    LayoutDashboard,
    Send,
    ShoppingBag,
    BarChart3,
    Mail,
    CheckCheck,
    Settings,
    Menu,
    X,
    Sparkles,
} from "lucide-react";

interface SidebarItem {
    href: string;
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const mainItems: SidebarItem[] = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/unread-emails", label: "Unread Emails", icon: Mail },
    { href: "/ready-to-send", label: "Ready to Send", icon: Send },
    { href: "/sent-emails", label: "Sent Emails", icon: CheckCheck },
];

const secondaryItems: SidebarItem[] = [
    { href: "/ready-to-sell", label: "Ready to Sell", icon: ShoppingBag },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function Sidebar() {
    const path = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    const renderLink = (
        href: string,
        label: string,
        Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
    ) => {
        const active = path === href;
        return (
            <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`
                    flex items-center gap-3 rounded-xl px-3 py-2.5
                    transition-all duration-150
                    ${active
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-muted hover:bg-border/40 hover:text-text"
                    }
                `}
            >
                <Icon className="size-[18px]" />
                <span className="text-sm font-medium">{label}</span>
            </Link>
        );
    };

    return (
        <>
            <header className="flex h-14 items-center justify-between border-b border-border bg-card px-3 md:hidden">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                        <Sparkles size={16} />
                    </div>
                    <h1 className="text-base font-semibold text-text">AI Mail</h1>
                </div>
                <button
                    type="button"
                    onClick={() => setMobileOpen((prev) => !prev)}
                    className="rounded-lg border border-border p-2 text-muted transition hover:border-primary hover:text-primary"
                    aria-label="Toggle navigation menu"
                    aria-expanded={mobileOpen}
                >
                    {mobileOpen ? <X size={16} /> : <Menu size={16} />}
                </button>
            </header>

            {mobileOpen && (
                <button
                    type="button"
                    aria-label="Close navigation overlay"
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-72 max-w-[86vw] flex-col border-r border-border bg-card transition-transform duration-200 md:static md:z-auto md:h-auto md:w-64 md:max-w-none md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                <div className="mb-6 flex items-center gap-2.5 px-4 pt-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
                        <Sparkles size={18} />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-text">AI Mail</h1>
                        <p className="text-[10px] text-muted">Smart Email Assistant</p>
                    </div>
                </div>

                <div className="px-3">
                    <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted/60">Main</p>
                    <nav className="flex flex-col gap-0.5">
                        {mainItems.map((item) => renderLink(item.href, item.label, item.icon))}
                    </nav>
                </div>

                <div className="mt-4 px-3">
                    <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted/60">Insights</p>
                    <nav className="flex flex-col gap-0.5">
                        {secondaryItems.map((item) => renderLink(item.href, item.label, item.icon))}
                    </nav>
                </div>

                <div className="mt-auto px-3 pb-4">
                    <div className="mb-3 h-px bg-border" />
                    {renderLink("/settings", "Settings", Settings)}
                    <p className="mt-4 px-3 text-[10px] text-muted/50">v1.0 AI Panel</p>
                </div>
            </aside>
        </>
    );
}
