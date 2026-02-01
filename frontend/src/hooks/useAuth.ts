import { useEffect, useState } from "react";
import { fetchMe } from "../services/auth";

export function useAuth() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMe().then((data) => {
            setUser(data);
            setLoading(false);
        });
    }, []);

    return { user, loading, isAuthenticated: !!user };
}
