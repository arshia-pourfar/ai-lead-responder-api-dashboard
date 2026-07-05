export default function Card({
    title,
    actions,
    footer,
    children,
}: {
    title: React.ReactNode;
    actions?: React.ReactNode;
    footer?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md">

            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                <div className="min-w-0">{title}</div>
                {actions && <div className="shrink-0">{actions}</div>}
            </div>

            <div className="scrollbar-thin flex-1 overflow-y-auto p-3 min-h-0">
                {children}
            </div>

            {footer && (
                <div className="border-t border-border px-4 py-2.5 text-xs text-muted">
                    {footer}
                </div>
            )}
        </div>
    );
}
