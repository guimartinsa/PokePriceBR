import { NavLink } from "react-router-dom";

type SideDrawerProps = {
    isOpen: boolean;
    onClose: () => void;
};

const navItems = [
    { to: "/", label: "Início" },
    { to: "/cards", label: "Cartas" },
    { to: "/scan", label: "Scanner" },
    { to: "/series", label: "Séries" },
    { to: "/artists", label: "Artistas" },
    { to: "/collection", label: "Coleções" },
    { to: "/perfil", label: "Perfil" },
];

export default function SideDrawer({ isOpen, onClose }: SideDrawerProps) {
    return (
        <>
            <button
                type="button"
                className={`side-drawer__backdrop${isOpen ? " is-open" : ""}`}
                aria-label="Fechar menu"
                onClick={onClose}
            />

            <aside className={`side-drawer${isOpen ? " is-open" : ""}`} aria-label="Navegação principal">
                <div className="side-drawer__header">
                    <h2 className="side-drawer__title">Menu</h2>
                    <button type="button" className="side-drawer__close" aria-label="Fechar menu" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <nav>
                    <ul className="side-drawer__list">
                        {navItems.map((item) => (
                            <li key={item.to}>
                                <NavLink
                                    to={item.to}
                                    className={({ isActive }) =>
                                        `side-drawer__link${isActive ? " is-active" : ""}`
                                    }
                                    onClick={onClose}
                                >
                                    {item.label}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>
        </>
    );
}
