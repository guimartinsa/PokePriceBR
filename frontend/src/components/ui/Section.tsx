import type { ReactNode } from "react";

type Props = {
    title?: string;
    children: ReactNode;
    className?: string;
    headerAction?: ReactNode;
};

export function Section({ title, children, className = "", headerAction }: Props) {
    return (
        <section className={`section ${className}`} style={{ marginBottom: "32px" }}>
            {(title || headerAction) && (
                <header
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "16px",
                    }}
                >
                    {title && <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>{title}</h2>}
                    {headerAction}
                </header>
            )}
            {children}
        </section>
    );
}