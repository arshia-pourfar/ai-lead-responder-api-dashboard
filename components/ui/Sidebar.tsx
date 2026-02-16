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
} from "lucide-react";

interface SidebarItem {
    href: string;
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const items: SidebarItem[] = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/unread-emails", label: "Unread Emails", icon: Mail },
    { href: "/ready-to-send", label: "Ready To Send", icon: Send },
    { href: "/sent-emails", label: "Sent Emails", icon: CheckCheck },
    { href: "/ready-to-sell", label: "Ready To Sell", icon: ShoppingBag },
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
                    border
                    ${active
                        ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
                        : "border-transparent text-muted hover:bg-border/40 hover:text-text"
                    }
                `}
            >
                <Icon className="size-4.5" />
                <span className="text-sm font-medium">{label}</span>
            </Link>
        );
    };

    return (
        <>
            <header className="flex h-14 items-center justify-between border-b border-border bg-card px-3 md:hidden">
                <div className="flex items-center gap-2">
                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                        <Mail size={16} />
                    </div>
                    <h1 className="text-base font-semibold text-text">AI Mail</h1>
                </div>
                <button
                    type="button"
                    onClick={() => setMobileOpen((prev) => !prev)}
                    className="rounded-md border border-border p-2 text-muted hover:border-primary hover:text-primary"
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
                    className="fixed inset-0 z-40 bg-black/30 md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-72 max-w-[86vw] flex-col border-r border-border bg-card p-4 transition-transform duration-200 md:static md:z-auto md:h-auto md:w-64 md:max-w-none md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                <div className="mb-8 flex items-center gap-2 px-2">
                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                        <Mail size={18} />
                    </div>
                    <h1 className="text-lg font-semibold text-text">AI Mail</h1>
                </div>

                <nav className="flex flex-col gap-1 overflow-y-auto pe-1">
                    {items.map((item) => renderLink(item.href, item.label, item.icon))}
                </nav>

                <div className="mt-auto">
                    {renderLink("/settings", "Settings", Settings)}
                    <div className="px-2 pt-6 text-xs text-muted">v1.0 AI Panel</div>
                </div>
            </aside>
        </>
    );
}
