"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import {
    LayoutDashboard,
    Send,
    ShoppingBag,
    BarChart3,
    Mail,
    Settings,
} from "lucide-react";

interface SidebarItem {
    href: string;
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const items: SidebarItem[] = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/unread-emails", label: "Unread Emails", icon: Mail }, // اضافه شد
    { href: "/ready-to-send", label: "Ready To Send", icon: Send },
    { href: "/ready-to-sell", label: "Ready To Sell", icon: ShoppingBag },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function Sidebar() {
    const path = usePathname();

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
                <Icon className="size-4.5" />
                <span className="text-sm font-medium">{label}</span>
            </Link>
        );
    };

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
                {items.map((item) => renderLink(item.href, item.label, item.icon))}
            </nav>

            {/* SETTINGS + FOOTER */}
            <div className="mt-auto">
                {renderLink("/settings", "Settings", Settings)}
                <div className="pt-6 text-xs text-muted px-2">v1.0 AI Panel</div>
            </div>
        </aside>
    );
}
