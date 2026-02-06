export default function Stat({
    label,
    value,
    color,
}: {
    label: string;
    value: number;
    color: string;
}) {
    return (
        <div className={`border border-border px-3 py-1 rounded-md ${color}`}>
            {label}: {value}
        </div>
    );
}
