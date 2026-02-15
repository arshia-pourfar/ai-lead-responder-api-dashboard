import { Loader2 } from "lucide-react";

type LoadingVariant = "dashboard" | "list" | "analytics";

function Block({ className = "" }: { className?: string }) {
    return (
        <div
            className={`loading-shimmer animate-pulse rounded-lg border border-border/80 bg-card/60 ${className}`}
        />
    );
}

function HeaderSkeleton() {
    return (
        <div className="mb-4 flex items-start justify-between">
            <div className="w-full max-w-xl">
                <Block className="h-7 w-48" />
                <Block className="mt-2 h-4 w-72" />
                <div className="mt-3 flex gap-2">
                    <Block className="h-7 w-28 rounded-md" />
                    <Block className="h-7 w-32 rounded-md" />
                    <Block className="h-7 w-24 rounded-md" />
                </div>
            </div>
            <Block className="h-10 w-10 rounded-full" />
        </div>
    );
}

function CardSkeleton({ rows = 4 }: { rows?: number }) {
    return (
        <div className="h-full rounded-2xl border border-border bg-card/40 p-3 shadow-sm backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between">
                <Block className="h-4 w-32" />
                <Block className="h-6 w-10 rounded-md" />
            </div>
            <div className="space-y-2">
                {Array.from({ length: rows }).map((_, i) => (
                    <Block key={i} className="h-16 rounded-xl" />
                ))}
            </div>
        </div>
    );
}

export default function SuperLoading({
    variant = "list",
    label = "Loading your emails",
}: {
    variant?: LoadingVariant;
    label?: string;
}) {
    if (variant === "dashboard") {
        return (
            <div className="h-full flex flex-col gap-3 overflow-auto relative">
                <HeaderSkeleton />
                <div className="grid grid-cols-2 grid-rows-2 gap-3 flex-1 overflow-hidden">
                    <CardSkeleton rows={3} />
                    <CardSkeleton rows={3} />
                    <CardSkeleton rows={3} />
                    <CardSkeleton rows={3} />
                </div>
                <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-1 text-xs text-muted">
                    <Loader2 size={14} className="animate-spin text-primary" />
                    {label}
                </div>
            </div>
        );
    }

    if (variant === "analytics") {
        return (
            <div className="h-full flex flex-col gap-4 overflow-auto">
                <HeaderSkeleton />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Block className="h-72 rounded-xl" />
                    <Block className="h-72 rounded-xl" />
                </div>
                <div className="rounded-xl border border-border bg-card/40 p-4">
                    <Block className="h-4 w-32 mb-3" />
                    <div className="space-y-2">
                        <Block className="h-14 rounded-lg" />
                        <Block className="h-14 rounded-lg" />
                        <Block className="h-14 rounded-lg" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gap-4 overflow-auto">
            <HeaderSkeleton />

            <div className="rounded-xl border border-border bg-card/40 p-3">
                <Block className="h-10 rounded-md" />
                <div className="mt-3 flex gap-2">
                    <Block className="h-7 w-24 rounded-md" />
                    <Block className="h-7 w-24 rounded-md" />
                    <Block className="h-7 w-20 rounded-md" />
                </div>
            </div>

            <div className="flex gap-3 text-xs">
                <Block className="h-7 w-28 rounded-md" />
                <Block className="h-7 w-20 rounded-md" />
            </div>

            <div className="space-y-2">
                <Block className="h-20 rounded-xl" />
                <Block className="h-20 rounded-xl" />
                <Block className="h-20 rounded-xl" />
                <Block className="h-20 rounded-xl" />
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                <Block className="h-8 w-16 rounded-md" />
                <div className="flex gap-1">
                    <Block className="h-8 w-8 rounded-md" />
                    <Block className="h-8 w-8 rounded-md" />
                    <Block className="h-8 w-8 rounded-md" />
                </div>
                <Block className="h-8 w-16 rounded-md" />
            </div>
        </div>
    );
}

