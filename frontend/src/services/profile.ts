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

export type UpdateProfilePayload = Partial<Profile> & {
    avatar_upload?: File | null;
};

export async function fetchProfile() {
    const res = await api.get<Profile>("/profile/");
    return res.data;
}

export async function updateProfile(payload: UpdateProfilePayload) {
    const formData = new FormData();

    if (payload.name !== undefined) formData.append("name", payload.name);
    if (payload.bio !== undefined) formData.append("bio", payload.bio ?? "");

    if (payload.avatar_option !== undefined) {
        if (payload.avatar_option === null) {
            formData.append("avatar_option", "");
        } else {
            formData.append("avatar_option", String(payload.avatar_option));
        }
    }

    if (payload.avatar_upload !== undefined) {
        if (payload.avatar_upload) {
            formData.append("avatar_upload", payload.avatar_upload);
        } else {
            formData.append("avatar_upload", "");
        }
    }

    const res = await api.put<Profile>("/profile/", formData);
    return res.data;
}

export async function fetchAvatars() {
    const res = await api.get<AvatarOption[]>("/profile/avatars/");
    return res.data;
}

export async function deleteAccount() {
    await api.delete("/profile/");
}