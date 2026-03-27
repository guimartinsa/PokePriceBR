import { NavLink } from "react-router-dom";

const navItems = [
    { to: "/", label: "Início" },
    { to: "/cards", label: "Cartas" },
    { to: "/scan", label: "Scanner" },
    { to: "/series", label: "Séries" },
    { to: "/artists", label: "Artistas" },
    { to: "/collection", label: "Coleções" },
    { to: "/perfil", label: "Perfil" },
];

export default function SideDrawer() {
    return (
        <aside className="side-drawer" aria-label="Navegação principal">
            <h2 className="side-drawer__title">Menu</h2>
            <nav>
                <ul className="side-drawer__list">
                    {navItems.map((item) => (
                        <li key={item.to}>
                            <NavLink
                                to={item.to}
                                className={({ isActive }) =>
                                    `side-drawer__link${isActive ? " is-active" : ""}`
                                }
                            >
                                {item.label}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
}
