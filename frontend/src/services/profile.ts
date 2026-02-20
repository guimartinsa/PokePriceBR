import { api } from "../api/api";

export type AvatarOption = {
    id: number;
    name: string;
    image_url: string;
};

export type Profile = {
    email: string;
    name: string;
    avatar?: string | null;
    avatar_option?: number | null;
    avatar_url?: string | null;
    bio?: string;
};

export async function fetchProfile() {
    const res = await api.get<Profile>("/profile/");
    return res.data;
}

export async function updateProfile(payload: Partial<Profile>) {
    const res = await api.put<Profile>("/profile/", payload);
    return res.data;
}

export async function fetchAvatars() {
    const res = await api.get<AvatarOption[]>("/profile/avatars/");
    return res.data;
}

export async function deleteAccount() {
    await api.delete("/profile/");
}