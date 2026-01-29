import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger";
    loading?: boolean;
}

export function Button({
    variant = "primary",
    loading,
    children,
    disabled,
    className = "",
    ...props
}: ButtonProps) {
    const variantStyles = {
        primary: {
            background: "#f6c400",
            color: "#111",
            border: "none",
        },
        secondary: {
            background: "transparent",
            color: "#f6c400",
            border: "1px solid #f6c400",
        },
        danger: {
            background: "#ef5350",
            color: "#fff",
            border: "none",
        },
    };

    return (
        <button
            className={`btn ${className}`}
            disabled={disabled || loading}
            style={{
                ...variantStyles[variant],
                padding: "10px 20px",
                borderRadius: "8px",
                fontWeight: 600,
                cursor: disabled || loading ? "not-allowed" : "pointer",
                opacity: disabled || loading ? 0.6 : 1,
                transition: "all 0.2s",
            }}
            {...props}
        >
            {loading ? "Carregando..." : children}
        </button>
    );
}