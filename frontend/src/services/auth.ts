import { api } from "../api/api";

export type AuthUser = {
    email: string;
    name: string;
    avatar?: string;
};

type AuthResponse = {
    access: string;
    refresh: string;
    user: AuthUser;
    plan?: "free" | "pro";
    badge?: string | null;
};

function saveTokens(data: AuthResponse) {
    localStorage.setItem("access", data.access);
    localStorage.setItem("refresh", data.refresh);
}

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
    const res = await api.post<AuthResponse>("auth/google/", { token: googleToken });
    saveTokens(res.data);
    return res.data.user;
}

export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
    const res = await api.post<AuthResponse>("auth/login/", { email, password });
    saveTokens(res.data);
    return res.data.user;
}

export async function registerWithEmail(
    name: string,
    email: string,
    password: string,
): Promise<AuthUser> {
    const res = await api.post<AuthResponse>("auth/register/", { name, email, password });
    saveTokens(res.data);
    return res.data.user;
}

/**
 * Logout: limpa tokens do localStorage
 */
export function logout(): void {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
}
