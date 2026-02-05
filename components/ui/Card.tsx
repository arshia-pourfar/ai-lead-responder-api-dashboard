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
        <div className="border border-border rounded-2xl p-3 h-full flex flex-col shadow-sm transition duration-150 bg-card/40 backdrop-blur-sm">

            {/* HEADER */}
            <div className="mb-2 flex items-center justify-between">
                <div>{title}</div>
                {actions && <div>{actions}</div>}
            </div>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto pe-1 scrollbar-thin">
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
