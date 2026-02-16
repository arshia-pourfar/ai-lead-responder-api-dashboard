interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    pageSizeOptions?: number[];
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
}

function getVisiblePages(currentPage: number, totalPages: number): number[] {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }

    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    const pages = new Set<number>([1, totalPages]);

    for (let page = start; page <= end; page += 1) {
        pages.add(page);
    }

    return Array.from(pages).sort((a, b) => a - b);
}

export default function PaginationControls({
    currentPage,
    totalPages,
    pageSize,
    pageSizeOptions = [10, 20, 50],
    onPageChange,
    onPageSizeChange,
}: PaginationControlsProps) {
    const pages = getVisiblePages(currentPage, totalPages);

    return (
        <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted">
                <span>Rows</span>
                <select
                    className="rounded-md border border-border bg-bg px-2 py-1 text-xs"
                    value={String(pageSize)}
                    onChange={(event) => onPageSizeChange(Number(event.target.value))}
                >
                    {pageSizeOptions.map((size) => (
                        <option key={size} value={String(size)}>
                            {size}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                    className="rounded-md border border-border px-3 py-1 text-xs disabled:opacity-50"
                >
                    Prev
                </button>

                <div className="flex max-w-full items-center gap-1 overflow-x-auto pb-1">
                    {pages.map((page, index) => {
                        const previousPage = pages[index - 1];
                        const showGap = previousPage !== undefined && page - previousPage > 1;

                        return (
                            <span key={page} className="flex items-center gap-1 shrink-0">
                                {showGap && <span className="px-1 text-xs text-muted">...</span>}
                                <button
                                    onClick={() => onPageChange(page)}
                                    className={`rounded-md border px-2 py-1 text-xs ${page === currentPage
                                        ? "border-primary text-primary"
                                        : "border-border text-muted"
                                        }`}
                                >
                                    {page}
                                </button>
                            </span>
                        );
                    })}
                </div>

                <button
                    onClick={() => onPageChange(Math.min(totalPages || 1, currentPage + 1))}
                    disabled={totalPages === 0 || currentPage >= totalPages}
                    className="rounded-md border border-border px-3 py-1 text-xs disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        </div>
    );
}
