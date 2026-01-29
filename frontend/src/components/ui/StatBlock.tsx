type Props = {
    value: string | number;
    label: string;
};

export function StatBlock({ value, label }: Props) {
    return (
        <div className="stat-block">
            <strong>{value}</strong>
            <span>{label}</span>
        </div>
    );
}