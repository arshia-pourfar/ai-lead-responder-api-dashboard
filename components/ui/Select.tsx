interface SelectOption {
    label: string;
    value: string;
}

interface SelectProps {
    label: string;
    value?: string;
    options?: SelectOption[];
    onChange?: (value: string) => void;
}

const DEFAULT_OPTIONS: SelectOption[] = [
    { label: "All", value: "all" },
    { label: "High", value: "high" },
    { label: "Medium", value: "medium" },
    { label: "Low", value: "low" },
];

export default function Select({ label, value, options, onChange }: SelectProps) {
    const selectOptions = options && options.length > 0 ? options : DEFAULT_OPTIONS;

    return (
        <select
            className="w-full min-w-36 rounded-md border border-border bg-bg px-2 py-1 text-xs sm:w-auto"
            value={value}
            onChange={(event) => onChange?.(event.target.value)}
        >
            {!value && <option value="">{label}</option>}
            {selectOptions.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}
