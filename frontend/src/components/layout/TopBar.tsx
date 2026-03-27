import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const fallbackAvatar = "https://ui-avatars.com/api/?name=User&background=222b38&color=fff";

type TopBarProps = {
    onMenuClick: () => void;
};

export default function TopBar({ onMenuClick }: TopBarProps) {
    const { user, loading, isAuthenticated, logout } = useAuth();

    if (loading) return null;

    return (
        <header
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 16px",
                background: "#0b111a",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                minHeight: 48,
            }}
        >
            <button
                type="button"
                onClick={onMenuClick}
                aria-label="Abrir menu"
                style={{
                    background: "transparent",
                    border: "1px solid #334155",
                    color: "#c8d2e2",
                    borderRadius: 8,
                    width: 36,
                    height: 36,
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                    fontSize: 18,
                }}
            >
                ☰
            </button>

            {isAuthenticated && user ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Link to="/perfil" style={{ display: "flex", alignItems: "center", gap: 8, color: "#b9c2cf", textDecoration: "none" }}>
                        <img
                            src={user.avatar || fallbackAvatar}
                            alt="Avatar do usuário"
                            style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
                        />
                        <span style={{ fontSize: 14 }}>{user.name || user.email}</span>
                    </Link>
                    <button
                        onClick={logout}
                        style={{
                            background: "transparent",
                            border: "1px solid #555",
                            color: "#aaa",
                            borderRadius: 6,
                            padding: "6px 12px",
                            fontSize: 13,
                            cursor: "pointer",
                        }}
                    >
                        Sair
                    </button>
                </div>
            ) : (
                <Link to="/auth" style={{ color: "#b9c2cf", textDecoration: "none", fontSize: 14 }}>
                    Entrar
                </Link>
            )}
        </header>
    );
}
