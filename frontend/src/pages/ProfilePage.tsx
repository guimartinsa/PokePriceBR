import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { deleteAccount, fetchAvatars, fetchProfile, updateProfile, type AvatarOption } from "../services/profile";
import { logout } from "../services/auth";


export function ProfilePage() {
    const { user, loading, refreshUser } = useAuth();
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [bio, setBio] = useState("");
    const [avatarOption, setAvatarOption] = useState<number | "">("");
    const [avatars, setAvatars] = useState<AvatarOption[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function load() {
            const [profileData, avatarsData] = await Promise.all([fetchProfile(), fetchAvatars()]);
            setName(profileData.name || "");
            setBio(profileData.bio || "");
            setAvatarOption(profileData.avatar_option || "");
            setAvatars(avatarsData);
        }
        if (user) {
            load();
        }
    }, [user]);

    const selectedAvatar = useMemo(
        () => avatars.find((avatar) => avatar.id === Number(avatarOption)),
        [avatars, avatarOption],
    );

    if (loading) return <p>Carregando...</p>;
    if (!user) return <Navigate to="/" />;

    async function handleSave() {
        setSaving(true);
        try {
            await updateProfile({ name, bio, avatar_option: avatarOption === "" ? null : Number(avatarOption) });
            await refreshUser();
            alert("Perfil atualizado!");
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteAccount() {
        const confirmed = window.confirm("Tem certeza que deseja excluir sua conta? Essa ação é irreversível.");
        if (!confirmed) return;

        await deleteAccount();
        logout();
        navigate("/");
    }

    return (
        <div style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
            <h1>Meu Perfil</h1>
            <p style={{ color: "#8f9bad" }}>{user.email}</p>

            <label style={{ display: "block", marginTop: 16 }}>
                Nome de usuário
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: "100%", marginTop: 6, padding: 10, borderRadius: 8 }}
                />
            </label>

            <label style={{ display: "block", marginTop: 16 }}>
                Avatar
                <select
                    value={avatarOption}
                    onChange={(e) => setAvatarOption(e.target.value ? Number(e.target.value) : "")}
                    style={{ width: "100%", marginTop: 6, padding: 10, borderRadius: 8 }}
                >
                    <option value="">Sem avatar</option>
                    {avatars.map((avatar) => (
                        <option key={avatar.id} value={avatar.id}>
                            {avatar.name}
                        </option>
                    ))}
                </select>
            </label>

            {selectedAvatar && (
                <img
                    src={selectedAvatar.image_url}
                    alt={selectedAvatar.name}
                    style={{ marginTop: 12, width: 96, height: 96, borderRadius: "50%", objectFit: "cover" }}
                />
            )}

            <label style={{ display: "block", marginTop: 16 }}>
                Bio
                <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    style={{ width: "100%", marginTop: 6, padding: 10, borderRadius: 8, minHeight: 96 }}
                />
            </label>

            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                <button onClick={handleSave} disabled={saving}>
                    {saving ? "Salvando..." : "Salvar perfil"}
                </button>
                <button onClick={handleDeleteAccount} style={{ backgroundColor: "#b3261e" }}>
                    Excluir conta
                </button>
                <button onClick={logout}>Sair</button>
            </div>
        </div>
    );
}
