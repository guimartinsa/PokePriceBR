import { api } from "../api/api";

export type UserCard = {
    card_id: number;
};

export async function fetchUserCollection() {
    const res = await api.get<UserCard[]>("/collection/");
    return res.data;
}
