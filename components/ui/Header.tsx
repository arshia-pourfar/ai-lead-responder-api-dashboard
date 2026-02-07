"use client";

import UserAvatar from "./UserAvatar";
import { LucideIcon } from "lucide-react";

type StatItem = {
    icon?: LucideIcon;
    label: string;
    value: string | number;
    color?: string;
};

export default function PageHeader({
    title,
    subtitle,
    stats,
}: {
    title: string;
    subtitle?: string;
    stats?: StatItem[];
}) {
    return (
        <div className="flex items-start justify-between mb-4">
            {/* LEFT */}
            <div>
                <h1 className="text-xl font-semibold text-text">{title}</h1>
                {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}

                {/* STATS */}
                {stats && stats.length > 0 && (
                    <div className="flex gap-2 mt-2 text-xs">
                        {stats.map((stat, i) => {
                            const Icon = stat.icon;
                            return (
                                <div
                                    key={i}
                                    className={`flex items-center gap-1 border border-border px-2 py-1 rounded-md ${stat.color || ""}`}
                                >
                                    {Icon && <Icon size={14} />}
                                    {stat.value} {stat.label}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* RIGHT */}
            <UserAvatar />
        </div>
    );
}
