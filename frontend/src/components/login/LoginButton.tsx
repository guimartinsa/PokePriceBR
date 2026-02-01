import { GoogleLogin } from "@react-oauth/google";

const API_URL = import.meta.env.VITE_API_URL;


export default function LoginButton()  {
    return (
        <GoogleLogin
            onSuccess={async (res) => {
                const token = res.credential;

                const r = await fetch(`${API_URL}/auth/google/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                });

                const data = await r.json();
                localStorage.setItem("access", data.access);
            }}
            onError={() => alert("Erro no login")}
        />
    );
}
