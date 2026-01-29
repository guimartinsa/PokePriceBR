type Props = {
    value: boolean | null;
    onChange: (value: boolean | null) => void;
};

export function OverNumberToggle({ value, onChange }: Props) {
    return (
        <div
            style={{
                display: "flex",
                gap: "8px",
                padding: "8px",
                background: "#f5f5f5",
                borderRadius: "6px",
            }}
        >
            <button
                onClick={() => onChange(null)}
                style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "4px",
                    border: "none",
                    background: value === null ? "#f6c400" : "#fff",
                    color: value === null ? "#111" : "#666",
                    fontWeight: value === null ? 600 : 400,
                    cursor: "pointer",
                    transition: "all 0.2s",
                }}
            >
                Todas
            </button>

            <button
                onClick={() => onChange(true)}
                style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "4px",
                    border: "none",
                    background: value === true ? "#f6c400" : "#fff",
                    color: value === true ? "#111" : "#666",
                    fontWeight: value === true ? 600 : 400,
                    cursor: "pointer",
                    transition: "all 0.2s",
                }}
            >
                Over-Number
            </button>

            <button
                onClick={() => onChange(false)}
                style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "4px",
                    border: "none",
                    background: value === false ? "#f6c400" : "#fff",
                    color: value === false ? "#111" : "#666",
                    fontWeight: value === false ? 600 : 400,
                    cursor: "pointer",
                    transition: "all 0.2s",
                }}
            >
                Normais
            </button>
        </div>
    );
}