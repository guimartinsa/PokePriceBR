import { api } from "../api/api";

export type AuthUser = {
    email: string;
    name: string;
    avatar?: string ;
};


/**
 * Busca dados do usuário autenticado via /me/
 * Retorna null se não houver token ou se a requisição falhar
 */
export async function fetchMe(): Promise<AuthUser | null> {
    const token = localStorage.getItem("access");
    if (!token) return null;

    try {
        const res = await api.get<AuthUser>("/me/");
        return res.data;
    } catch {
        // Token inválido ou expirado -> limpa
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        return null;
    }
}

/**
 * Envia token Google para o backend e salva os tokens retornados
 */
export async function loginWithGoogle(googleToken: string): Promise<AuthUser> {
    const res = await api.post<{
        access: string;
        refresh: string;
        user: AuthUser;
    }>("auth/google/", { token: googleToken });

    localStorage.setItem("access", res.data.access);
    localStorage.setItem("refresh", res.data.refresh);

    return res.data.user;
}

/**
 * Logout: limpa tokens do localStorage
 */
export function logout(): void {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
}