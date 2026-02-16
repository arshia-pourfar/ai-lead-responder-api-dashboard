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
        <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-card p-3 shadow-sm backdrop-blur-sm transition duration-150">

            {/* HEADER */}
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">{title}</div>
                {actions && <div className="shrink-0">{actions}</div>}
            </div>

            {/* BODY */}
            <div className="scrollbar-thin flex-1 overflow-y-auto pe-1 min-h-0">
                {children}
            </div>

            {/* FOOTER (optional) */}
            {footer && (
                <div className="py-2 mt-2 border-t border-border text-xs text-muted">
                    {footer}
                </div>
            )}
        </div>
    );
}
