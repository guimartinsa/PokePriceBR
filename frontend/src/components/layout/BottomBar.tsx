import { useNavigate } from "react-router-dom";

export default function BottomBar() {
    const navigate = useNavigate();

    return (
        <nav className="bottom-bar">
            <button onClick={() => navigate("/")}>Home</button>
            <button onClick={() => navigate("/cards")}>Cartas</button>

            {/* Botão central da câmera */}
            <button
                className="scan-button"
                onClick={() => navigate("/scan")}
            >
                📷
            </button>
        </nav>
    );
}
