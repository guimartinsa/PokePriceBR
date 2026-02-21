import { api } from "../api/api";

export type CheckoutSessionResponse = {
    checkout_url: string;
};

export type TrialActivationResponse = {
    status: string;
    plan: "free" | "pro";
    trial_until: string | null;
};

export async function createCheckoutSession() {
    const res = await api.post<CheckoutSessionResponse>("/billing/checkout/session/");
    return res.data;
}

export async function activateTrial() {
    const res = await api.post<TrialActivationResponse>("/billing/trial/activate/");
    return res.data;
}