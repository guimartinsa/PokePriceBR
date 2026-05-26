import { NavLink } from "react-router-dom";
import IconeBusca from "../../assets/icons/busca-icon.svg";
import IconeCamera from "../../assets/icons/camera-pokemon.svg";
import IconeColecao from "../../assets/icons/colecaoicon.svg";
import IconHome from "../../assets/icons/home-icon.svg";
import WishlistIcon from "../../assets/icons/wishlist-icon.svg";
import CheckballIcon from "../../assets/icons/checkball-icon.svg";

type SideDrawerProps = {
    isOpen: boolean;
    isDesktop: boolean;
    isCollapsed: boolean;
    onClose: () => void;
    onToggleCollapse: () => void;
};

const navItems = [
    { to: "/", label: "Início", iconSrc: IconHome },
    { to: "/cards", label: "Cartas", iconSrc: IconeBusca },
    { to: "/scan", label: "Scanner", iconSrc: IconeCamera },
    { to: "/series", label: "Séries", iconSrc: WishlistIcon },
    { to: "/artists", label: "Artistas", iconSrc: CheckballIcon },
    { to: "/collection", label: "Coleções", iconSrc: IconeColecao },
    { to: "/perfil", label: "Perfil", iconSrc: CheckballIcon },
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
                                    <span className="side-drawer__icon" aria-hidden="true">
                                        <img src={item.iconSrc} alt="" width={22} height={22} />
                                    </span>
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
