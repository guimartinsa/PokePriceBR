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
    ...props
}: ButtonProps) {
    return (
        <button
            className={`btn btn--${variant}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? "Carregando..." : children}
        </button>
    );
}