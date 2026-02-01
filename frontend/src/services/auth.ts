const API_URL = import.meta.env.VITE_API_URL;

export async function fetchMe() {
    const token = localStorage.getItem("access");

    if (!token) return null;

    const res = await fetch(`${API_URL}/me/`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        localStorage.removeItem("access");
        return null;
    }

    return res.json();
}
