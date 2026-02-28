//import { CameraView } from "../components/camera/CameraView";
import { useNavigate } from "react-router-dom";
import cameraIcon from "../assets/icons/camera-pokemon.svg";


/**
 * Página de scan de cartas
 * Renderiza apenas o componente CameraView
 * Toda lógica está dentro do CameraView
 */

{/*
export default function ScanPage() {
    return <CameraView />;
}
*/}

export default function ScanPage() {
    const navigate = useNavigate();

    return (
        <section
            style={{
                minHeight: "calc(100vh - 150px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 20,
                textAlign: "center",
                padding: "24px 20px 80px",
                color: "#f4f6ff",
            }}
        >
            <h1 style={{ fontSize: "2.2rem", margin: 0, fontWeight: 700, color: "#aab0be" }}>Ops!</h1>

            <img
                src={cameraIcon}
                alt="Funcionalidade da câmera indisponível"
                style={{ width: 150, height: 150, opacity: 0.85 }}
            />

            <p style={{ fontSize: "1.8rem", margin: 0, maxWidth: 320, lineHeight: 1.35 }}>
                Desculpe, a câmera está temporariamente indisponível.
            </p>

            <button
                onClick={() => navigate(-1)}
                style={{
                    marginTop: 8,
                    background: "#151729",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    color: "#f4f6ff",
                    borderRadius: 999,
                    padding: "12px 28px",
                    fontSize: "1rem",
                    fontWeight: 600,
                    cursor: "pointer",
                }}
            >
                ← Voltar
            </button>
        </section>
    );
}