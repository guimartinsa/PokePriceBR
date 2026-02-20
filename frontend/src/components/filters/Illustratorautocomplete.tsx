import { useEffect, useState } from "react";
import { api } from "../../api/api";
import { useDebounce } from "../../hooks/useDebounce";

type Props = {
    value: string;
    onChange: (value: string) => void;
};

export function IllustratorAutocomplete({ value, onChange }: Props) {
    const [ilustradores, setIlustradores] = useState<string[]>([]);
    const [open, setOpen] = useState(false);

    const debouncedValue = useDebounce(value);

    useEffect(() => {
        if (debouncedValue.length < 2) {
            setIlustradores([]);
            return;
        }

        api
            .get<string[]>("/ilustradores/", {
                params: { q: debouncedValue },
            })
            .then((res) => setIlustradores(res.data))
            .catch(() => setIlustradores([]));
    }, [debouncedValue]);

    return (
        <div style={{ position: "relative", width: "100%" }}>
            <input
                placeholder="Ilustrador (ex: Mitsuhiro Arita)"
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setOpen(true);
                }}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #ddd",
                    fontSize: "14px",
                }}
            />

            {open && ilustradores.length > 0 && (
                <ul
                    style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        background: "#242424",
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                        listStyle: "none",
                        padding: 0,
                        margin: "4px 0",
                        zIndex: 10,
                        maxHeight: 200,
                        overflowY: "auto",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                >
                    {ilustradores.map((ilustrador, idx) => (
                        <li
                            key={idx}
                            style={{
                                padding: "12px",
                                cursor: "pointer",
                                borderBottom: "1px solid #f5f5f5",
                            }}
                            onMouseDown={() => {
                                onChange(ilustrador);
                                setOpen(false);
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#f5f5f5";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#fff";
                            }}
                        >
                            {ilustrador}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}