import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router-dom";

export function ProfilePage() {
    const { user, loading, logout } = useAuth();

    if (loading) return <p>Carregando...</p>;
    if (!user) return <Navigate to="/" />;

    return (
        <div>
            <h1>Meu Perfil</h1>

            <img src={user.avatar} alt="Avatar" width={80} />
            <p>{user.name}</p>
            <p>{user.email}</p>

            <button onClick={logout}>Sair</button>
        </div>
    );
}
