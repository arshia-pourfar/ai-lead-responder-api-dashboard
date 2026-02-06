export default function Select({ label }: { label: string }) {
    return (
        <select className="border border-border rounded-md px-2 py-1 bg-bg text-xs">
            <option>{label}</option>
            <option>All</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
        </select>
    );
}
