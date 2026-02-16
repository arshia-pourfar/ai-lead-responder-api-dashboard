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
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            {/* LEFT */}
            <div className="min-w-0 flex-1">
                <h1 className="break-words text-lg font-semibold text-text sm:text-xl">{title}</h1>
                {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}

                {/* STATS */}
                {stats && stats.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {stats.map((stat, i) => {
                            const Icon = stat.icon;
                            return (
                                <div
                                    key={i}
                                    className={`flex max-w-full items-center gap-1 rounded-md border border-border px-2 py-1 ${stat.color || ""}`}
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
            <div className="self-start sm:self-auto">
                <UserAvatar />
            </div>
        </div>
    );
}
