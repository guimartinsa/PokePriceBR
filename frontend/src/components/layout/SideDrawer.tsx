import { NavLink } from "react-router-dom";

type SideDrawerProps = {
    isOpen: boolean;
    isDesktop: boolean;
    isCollapsed: boolean;
    onClose: () => void;
    onToggleCollapse: () => void;
};

const navItems = [
    { to: "/", label: "Início", icon: "🏠" },
    { to: "/cards", label: "Cartas", icon: "🃏" },
    { to: "/scan", label: "Scanner", icon: "📷" },
    { to: "/series", label: "Séries", icon: "📚" },
    { to: "/artists", label: "Artistas", icon: "🎨" },
    { to: "/collection", label: "Coleções", icon: "📦" },
    { to: "/perfil", label: "Perfil", icon: "👤" },
];

export default function SideDrawer({ isOpen, isDesktop, isCollapsed, onClose, onToggleCollapse }: SideDrawerProps) {
    return (
        <>
            <button
                type="button"
                className={`side-drawer__backdrop${isOpen && !isDesktop ? " is-open" : ""}`}
                aria-label="Fechar menu"
                onClick={onClose}
            />

            <aside
                className={`side-drawer${isOpen ? " is-open" : ""}${isDesktop ? " is-desktop" : ""}${isCollapsed ? " is-collapsed" : ""}`}
                aria-label="Navegação principal"
            >
                <div className="side-drawer__header">
                    {!isCollapsed && <h2 className="side-drawer__title">Menu</h2>}
                    {isDesktop ? (
                        <button
                            type="button"
                            className="side-drawer__close"
                            aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
                            onClick={onToggleCollapse}
                        >
                            {isCollapsed ? "›" : "‹"}
                        </button>
                    ) : (
                        <button type="button" className="side-drawer__close" aria-label="Fechar menu" onClick={onClose}>
                            ✕
                        </button>
                    )}
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
                                    <span className="side-drawer__icon" aria-hidden="true">{item.icon}</span>
                                    {!isCollapsed && <span>{item.label}</span>}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>
        </>
    );
}
