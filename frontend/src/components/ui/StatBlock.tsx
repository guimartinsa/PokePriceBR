type Props = {
    value: string | number;
    label: string;
};

export function StatBlock({ value, label }: Props) {
    return (
        <div className="stat-block" style={{ textAlign: "center" }}>
            <strong
                style={{
                    display: "block",
                    fontSize: "1.4rem",
                    color: "#f6c400",
                    marginBottom: "4px",
                }}
            >
                {value}
            </strong>
            <span
                style={{
                    fontSize: "0.75rem",
                    color: "#9aa4b2",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                }}
            >
                {label}
            </span>
        </div>
    );
}