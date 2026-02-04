export default function Card({
    title,
    children,
}: {
    title: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="border border-border rounded-2xl p-4 h-full flex flex-col shadow-sm hover:shadow-md transition duration-150">
            <div className="mb-3">{title}</div>

            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
                {children}
            </div>
        </div>
    );
}
