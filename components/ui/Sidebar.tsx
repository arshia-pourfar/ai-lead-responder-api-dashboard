"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
    { href: "/", label: "Dashboard" },
    { href: "/ready-to-send", label: "Ready To Send" },
    { href: "/ready-to-sell", label: "Ready To Sell" },
    { href: "/analytics", label: "Analytics" },
];

export default function Sidebar() {
    const path = usePathname();

    return (
        <aside className="w-60 bg-card border-r border-border p-4">
            <h1 className="text-xl font-bold mb-6">AI Mail</h1>
            <nav className="space-y-2">
                {items.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`block p-2 rounded-xl ${path === item.href
                                ? "bg-primary text-white"
                                : "hover:bg-border"
                            }`}
                    >
                        {item.label}
                    </Link>
                ))}
            </nav>
        </aside>
    );
}
