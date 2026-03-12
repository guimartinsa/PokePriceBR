import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { AxiosError } from "axios";
import { useAuth } from "../hooks/useAuth";
import { deleteAccount, fetchAvatars, fetchProfile, updateProfile, type AvatarOption } from "../services/profile";
import { activateTrial, createCheckoutSession } from "../services/billing";
import { logout } from "../services/auth";
import { hasSubscriberPrivileges } from "../utils/plan";

export function ProfilePage() {
    const { user, loading, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [name, setName] = useState("");
    const [bio, setBio] = useState("");
    const [avatarOption, setAvatarOption] = useState<number | "">("");
    const [avatars, setAvatars] = useState<AvatarOption[]>([]);
    const [avatarUpload, setAvatarUpload] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string>("");
    const [serverAvatarUrl, setServerAvatarUrl] = useState<string>("");
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
            setServerAvatarUrl(profileData.avatar_url || "");
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
    const isAdminUser = ("is_admin" in user && Boolean(user.is_admin)) || userPlan === "ADMIN";
    const userBadge = "badge" in user && typeof user.badge === "string" ? user.badge : "";
    const userHasSubscriberPrivileges = hasSubscriberPrivileges(user?.plan);

    const canUploadCustomAvatar = userHasSubscriberPrivileges;
    async function handleSave() {
        setSaving(true);
        try {
            await updateProfile({
                name,
                bio,
                avatar_option: avatarOption === "" ? null : Number(avatarOption),
                avatar_upload: avatarUpload,
            });
            await refreshUser();
            setAvatarUpload(null);
            setAvatarPreview("");
            alert("Perfil atualizado!");
        } finally {
            setSaving(false);
        }
    }

    function handleAvatarUploadChange(file: File | null) {
        setAvatarUpload(file);
        if (!file) {
            setAvatarPreview("");
            return;
        }
        setAvatarOption("");
        const previewUrl = URL.createObjectURL(file);
        setAvatarPreview(previewUrl);
    }

    const displayedAvatar = avatarPreview || selectedAvatar?.image_url || serverAvatarUrl;

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
        } catch (error) {
            const axiosError = error as AxiosError<{ detail?: string }>;
            alert(axiosError.response?.data?.detail || "Não foi possível iniciar o checkout Stripe.");
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
        <div style={{ maxWidth: 760, margin: "0 auto", padding: 20 }}>
            <h1 style={{ marginBottom: 8, color: "#e8f0ff" }}>Meu Perfil</h1>
            <p style={{ color: "#9fb2cc", marginBottom: 2 }}>{user.email}</p>
            <p style={{ color: "#9fb2cc", marginTop: 4 }}>
                Usuário admin: <strong>{isAdminUser ? "SIM" : "NÃO"}</strong>
                {!isAdminUser && <> | Plano atual: <strong>{userPlan}</strong></>}
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

            <div style={{ marginTop: 18, padding: 16, border: "1px solid #2f3845", borderRadius: 14, background: "linear-gradient(180deg, #162230 0%, #121820 100%)", boxShadow: "0 10px 20px rgba(0,0,0,0.2)" }}>
                <h2 style={{ marginTop: 0, marginBottom: 12, color: "#dce9ff" }}>Assinatura Stripe</h2>
                {userHasSubscriberPrivileges ? (
                    <p style={{ color: "#8f9bad" }}>
                        Sua conta já possui privilégios de assinante.
                    </p>
                ) : (
                    <>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button onClick={handleActivateTrial} disabled={activatingTrial}>
                                {activatingTrial ? "Ativando..." : "Ativar período de testes"}
                            </button>
                            <button onClick={handleStartCheckout} disabled={startingCheckout}>
                                {startingCheckout ? "Redirecionando..." : "Assinar PRO"}
                            </button>
                        </div>
                    </>
                )}
            </div>

            <label style={{ display: "block", marginTop: 16, color: "#dce9ff" }}>
                Nome de usuário
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: "100%", marginTop: 6, padding: 10, borderRadius: 10, border: "1px solid #334155", background: "#0f1722", color: "#e8f0ff" }}
                />
            </label>

            <label style={{ display: "block", marginTop: 16, color: "#dce9ff" }}>
                Avatar
                <select
                    value={avatarOption}
                    onChange={(e) => {
                        setAvatarOption(e.target.value ? Number(e.target.value) : "");
                        setAvatarUpload(null);
                        setAvatarPreview("");
                    }}
                    style={{ width: "100%", marginTop: 6, padding: 10, borderRadius: 10, border: "1px solid #334155", background: "#0f1722", color: "#e8f0ff" }}
                >
                    <option value="">Sem avatar</option>
                    {avatars.map((avatar) => (
                        <option key={avatar.id} value={avatar.id}>
                            {avatar.name}
                        </option>
                    ))}
                </select>
            </label>

            {canUploadCustomAvatar && (
                <label style={{ display: "block", marginTop: 16, color: "#dce9ff" }}>
                    Avatar personalizado (PRO/Admin)
                    <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => handleAvatarUploadChange(e.target.files?.[0] || null)}
                        style={{ display: "block", marginTop: 6 }}
                    />
                    <small style={{ color: "#8f9bad" }}>JPG, PNG ou WEBP até 2MB.</small>
                </label>
            )}

            {displayedAvatar && (
                <img
                    src={displayedAvatar}
                    alt="Avatar selecionado"
                    style={{ marginTop: 12, width: 108, height: 108, borderRadius: "50%", objectFit: "cover", border: "3px solid #60a5fa", boxShadow: "0 8px 18px rgba(37, 99, 235, 0.35)" }}
                />
            )}

            <label style={{ display: "block", marginTop: 16, color: "#dce9ff" }}>
                Bio
                <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    style={{ width: "100%", marginTop: 6, padding: 10, borderRadius: 10, minHeight: 96, border: "1px solid #334155", background: "#0f1722", color: "#e8f0ff" }}
                />
            </label>

            <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
                <button onClick={handleSave} disabled={saving} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px" }}>
                    {saving ? "Salvando..." : "Salvar perfil"}
                </button>
                <button onClick={handleDeleteAccount} style={{ backgroundColor: "#b3261e", color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px" }}>
                    Excluir conta
                </button>
                <button onClick={logout} style={{ background: "#1f2937", color: "#fff", border: "1px solid #374151", borderRadius: 10, padding: "10px 14px" }}>Sair</button>
            </div>
        </div>
    );
}
