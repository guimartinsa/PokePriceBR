import type { ReactNode } from "react";

type Props = {
    title?: string;
    children: ReactNode;
    className?: string;
};

export function Section({ title, children, className = "" }: Props) {
    return (
        <section className={`section ${className}`}>
            {title && <h2>{title}</h2>}
            {children}
        </section>
    );
}