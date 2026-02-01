import { useCallback, useEffect, useState } from "react";
import {
    fetchMe,
    logout as logoutService,
    type AuthUser,
} from "../services/auth";

export function useAuth() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        try {
            const data = await fetchMe();
            setUser(data);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const logout = useCallback(() => {
        logoutService();
        setUser(null);
    }, []);

    return {
        user,
        loading,
        isAuthenticated: !!user,
        logout,
        refreshUser: checkAuth, // ✅ ESSENCIAL
    };
}
