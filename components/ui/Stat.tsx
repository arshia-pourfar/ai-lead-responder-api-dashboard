export default function Stat({
    label,
    value,
    color,
}: {
    label: string;
    value: number | string;
    color: string;
}) {
    return (
        <div className={`rounded-md border border-border px-3 py-1 text-xs sm:text-sm ${color}`}>
            {label}: {value}
        </div>
    );
}
