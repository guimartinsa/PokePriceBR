import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { AxiosError } from "axios";;
import { useAuth } from "../hooks/useAuth";
import { deleteAccount, fetchAvatars, fetchProfile, updateProfile, type AvatarOption } from "../services/profile";
import { activateTrial, createCheckoutSession } from "../services/billing";
import { logout } from "../services/auth";


export function ProfilePage() {
    const { user, loading, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [name, setName] = useState("");
    const [bio, setBio] = useState("");
    const [avatarOption, setAvatarOption] = useState<number | "">("");
    const [avatars, setAvatars] = useState<AvatarOption[]>([]);
    const [saving, setSaving] = useState(false);
    const [activatingTrial, setActivatingTrial] = useState(false);
    const [startingCheckout, setStartingCheckout] = useState(false);

    const billingStatus = searchParams.get("billing");

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

    const userPlan = "plan" in user && typeof user.plan === "string" ? user.plan.toUpperCase() : "FREE";
    const userBadge = "badge" in user && typeof user.badge === "string" ? user.badge : "";

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

    async function handleActivateTrial() {
        setActivatingTrial(true);
        try {
            await activateTrial();
            await refreshUser();
            alert("Período de testes ativado com sucesso!");
        } catch (error) {
            const axiosError = error as AxiosError<{ detail?: string }>;
            alert(axiosError.response?.data?.detail || "Não foi possível ativar o período de testes.");
        } finally {
            setActivatingTrial(false);
        }
    }

    async function handleStartCheckout() {
        setStartingCheckout(true);
        try {
            const data = await createCheckoutSession();
            window.location.href = data.checkout_url;
        } catch {
            alert("Não foi possível iniciar o checkout Stripe.");
            setStartingCheckout(false);
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
            <p style={{ color: "#8f9bad", marginTop: 4 }}>
                Plano atual: <strong>{userPlan}</strong>
                {userBadge ? ` (${userBadge})` : ""}
            </p>

            {billingStatus === "success" && (
                <p style={{ marginTop: 12, color: "#2e7d32" }}>
                    Pagamento confirmado! Seu plano será atualizado em instantes.
                </p>
            )}
            {billingStatus === "cancel" && (
                <p style={{ marginTop: 12, color: "#b3261e" }}>
                    Checkout cancelado. Você pode tentar novamente quando quiser.
                </p>
            )}

            <div style={{ marginTop: 16, padding: 12, border: "1px solid #2f3845", borderRadius: 8 }}>
                <h2 style={{ marginTop: 0 }}>Assinatura (Stripe - ambiente de testes)</h2>
                <p style={{ color: "#8f9bad" }}>
                    Integração com Stripe em modo de teste. Use cartões de teste da Stripe no checkout.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={handleActivateTrial} disabled={activatingTrial}>
                        {activatingTrial ? "Ativando..." : "Ativar período de testes"}
                    </button>
                    <button onClick={handleStartCheckout} disabled={startingCheckout}>
                        {startingCheckout ? "Redirecionando..." : "Assinar PRO (Stripe Test)"}
                    </button>
                </div>
            </div>

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
