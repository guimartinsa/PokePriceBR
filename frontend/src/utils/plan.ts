export type UserPlan = "FREE" | "PRO" | "ADMIN";

export function hasSubscriberPrivileges(plan?: string | null): boolean {
    return plan === "PRO" || plan === "ADMIN";
}