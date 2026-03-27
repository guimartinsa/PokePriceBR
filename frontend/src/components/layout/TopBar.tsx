import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const fallbackAvatar = "https://ui-avatars.com/api/?name=User&background=222b38&color=fff";

type TopBarProps = {
    onMenuClick: () => void;
    isDesktop: boolean;
};

export default function TopBar({ onMenuClick, isDesktop }: TopBarProps) {
    const { user, loading, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const [searchValue, setSearchValue] = useState("");

    if (loading) return null;

    const handleSearch = (event: FormEvent) => {
        event.preventDefault();
        const query = searchValue.trim();
        navigate(query ? `/cards?nome=${encodeURIComponent(query)}` : "/cards");
    };

    return (
        <header className="topbar">
            <button
                type="button"
                onClick={onMenuClick}
                aria-label={isDesktop ? "Recolher menu" : "Abrir menu"}
                className="topbar__menu-button"
            >
                ☰
            </button>

            <Link to="/" className="topbar__logo" aria-label="Ir para a página inicial">
                <img src="/favicon.svg" alt="PokePriceBR" />
                <span>PokePriceBR</span>
            </Link>

            {isDesktop && (
                <form className="topbar__search" onSubmit={handleSearch}>
                    <input
                        type="search"
                        placeholder="Buscar cartas..."
                        value={searchValue}
                        onChange={(event) => setSearchValue(event.target.value)}
                        aria-label="Buscar cartas"
                    />
                    <button type="submit" aria-label="Buscar cartas">
                        🔎
                    </button>
                    <Link to="/cards" className="topbar__advanced-search" aria-label="Busca avançada">
                        ⚙
                    </Link>
                </form>
            )}

            {isAuthenticated && user ? (
                <div className="topbar__profile">
                    <Link to="/perfil" className="topbar__profile-link">
                        <img
                            src={user.avatar || fallbackAvatar}
                            alt="Avatar do usuário"
                            className="topbar__avatar"
                        />
                        <span>{user.name || user.email}</span>
                    </Link>
                    <button onClick={logout} className="topbar__logout">
                        Sair
                    </button>
                </div>
            ) : (
                <Link to="/auth" className="topbar__login">
                    Entrar
                </Link>
            )}
        </header>
    );
}
