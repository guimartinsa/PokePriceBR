import { useEffect, useState } from "react";

declare global {
    interface Window {
        google?: any;
    }
}

const GOOGLE_GSI_SRC = "https://accounts.google.com/gsi/client";

export function useGoogleAuthLoader() {
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (window.google?.accounts?.id) {
            setIsReady(true);
            return;
        }

        const existingScript = document.querySelector<HTMLScriptElement>(
            `script[src="${GOOGLE_GSI_SRC}"]`
        );

        const onLoad = () => {
            if (window.google?.accounts?.id) {
                setIsReady(true);
                return;
            }
            setError("Google Auth indisponível no momento.");
        };

        const onError = () => {
            setError("Falha ao carregar autenticação do Google.");
        };

        if (existingScript) {
            existingScript.addEventListener("load", onLoad);
            existingScript.addEventListener("error", onError);
            return () => {
                existingScript.removeEventListener("load", onLoad);
                existingScript.removeEventListener("error", onError);
            };
        }

        const script = document.createElement("script");
        script.src = GOOGLE_GSI_SRC;
        script.async = true;
        script.defer = true;
        script.onload = onLoad;
        script.onerror = onError;
        document.head.appendChild(script);

        return () => {
            script.onload = null;
            script.onerror = null;
        };
    }, []);

    return { isReady, error };
}