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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold tracking-tight text-text">{title}</h1>
                {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}

                {stats && stats.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {stats.map((stat, i) => {
                            const Icon = stat.icon;
                            return (
                                <div
                                    key={i}
                                    className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:border-primary/30"
                                >
                                    {Icon && <Icon size={14} className={stat.color || "text-muted"} />}
                                    <span className={stat.color || "text-text"}>{stat.value}</span>
                                    <span className="text-muted">{stat.label}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="self-start sm:self-auto">
                <UserAvatar />
            </div>
        </div>
    );
}
