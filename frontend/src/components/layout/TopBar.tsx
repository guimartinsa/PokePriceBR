import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import LoginButton from "../login/LoginButton";

export default function TopBar() {
    const { user, loading, isAuthenticated, logout } = useAuth();
    // Força re-render após login bem-sucedido
    const [, setTick] = useState(0);

    if (loading) return null; // não flash de UI enquanto verifica token

    return (
        <header
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                padding: "10px 16px",
                background: "#0b111a",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                minHeight: 48,
            }}
        >
            {isAuthenticated && user ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ color: "#b9c2cf", fontSize: 14 }}>
                        {user.name || user.email}
                    </span>
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
                <LoginButton
                    onLogin={() => {
                        // Força o hook useAuth a re-verificar
                        setTick((t) => t + 1);
                    }}
                />
            )}
        </header>
    );
}