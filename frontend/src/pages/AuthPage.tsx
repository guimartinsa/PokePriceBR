import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import LoginButton from "../components/login/LoginButton";
import { useAuth } from "../hooks/useAuth";
import { loginWithEmail, registerWithEmail } from "../services/auth";

type Mode = "login" | "register";

export default function AuthPage() {
    const [mode, setMode] = useState<Mode>("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const { user, loading, refreshUser } = useAuth();
    const navigate = useNavigate();

    if (loading) return <p style={{ padding: 16 }}>Carregando...</p>;
    if (user) return <Navigate to="/perfil" />;

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            if (mode === "login") {
                await loginWithEmail(email, password);
            } else {
                await registerWithEmail(name, email, password);
            }
            await refreshUser();
            navigate("/perfil");
        } catch (err: any) {
            const apiError = err?.response?.data?.error;
            setError(apiError || "Não foi possível autenticar agora.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <section className="auth-page">
            <div className="auth-card">
                <h1>{mode === "login" ? "Entrar" : "Criar conta"}</h1>
                <p>Acesse seu perfil com Google ou email.</p>

                <div className="auth-google">
                    <LoginButton
                        onLogin={async () => {
                            await refreshUser();
                            navigate("/perfil");
                        }}
                    />
                </div>

                <div className="auth-divider">ou</div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {mode === "register" && (
                        <input
                            placeholder="Seu nome"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    )}

                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    {error && <p className="auth-error">{error}</p>}

                    <button type="submit" className="cta" disabled={submitting}>
                        {submitting
                            ? "Enviando..."
                            : mode === "login"
                            ? "Entrar com email"
                            : "Criar conta com email"}
                    </button>
                </form>

                <button
                    className="auth-toggle"
                    onClick={() => {
                        setError("");
                        setMode(mode === "login" ? "register" : "login");
                    }}
                >
                    {mode === "login"
                        ? "Ainda não tem conta? Criar agora"
                        : "Já tem conta? Fazer login"}
                </button>
            </div>
        </section>
    );
}
