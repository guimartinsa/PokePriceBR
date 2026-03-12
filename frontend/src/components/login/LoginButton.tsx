import { useEffect, useRef } from "react";
import { loginWithGoogle } from "../../services/auth";
import type { AuthUser } from "../../services/auth";
import { useGoogleAuthLoader } from "../../hooks/useGoogleAuthLoader";

type Props = {
    onLogin?: (user: AuthUser) => void;
};

export default function LoginButton({ onLogin }: Props) {
    const buttonRef = useRef<HTMLDivElement | null>(null);
    const { isReady, error } = useGoogleAuthLoader();

    useEffect(() => {
        if (!isReady || !buttonRef.current || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            callback: async (response: { credential?: string }) => {
                if (!response.credential) return;

                try {
                    const user = await loginWithGoogle(response.credential);
                    onLogin?.(user);
                } catch {
                    alert("Erro ao fazer login. Tente novamente.");
                }
            },
        });

        buttonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonRef.current, {
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "pill",
        });
    }, [isReady, onLogin]);

    if (error) {
        return <p>{error}</p>;
    }

    return <div ref={buttonRef} aria-label="Entrar com Google" />;
}