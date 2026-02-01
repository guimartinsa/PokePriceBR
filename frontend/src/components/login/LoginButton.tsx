import { GoogleLogin } from "@react-oauth/google";
import { loginWithGoogle } from "../../services/auth";
import type { AuthUser } from "../../services/auth";

type Props = {
    onLogin?: (user: AuthUser) => void;
};

export default function LoginButton({ onLogin }: Props) {
    return (
        <GoogleLogin
            onSuccess={async (res) => {
                console.log("CREDENTIAL:", res.credential);
                if (!res.credential) return;

                try {
                    const user = await loginWithGoogle(res.credential);
                    onLogin?.(user);
                } catch {
                    alert("Erro ao fazer login. Tente novamente.");
                }
            }}
            onError={() => alert("Erro no login com Google")}
        />
    );
}