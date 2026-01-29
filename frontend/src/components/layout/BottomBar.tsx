import { useNavigate } from "react-router-dom";
import  IconeBusca from "../../assets/icons/busca-icon.svg";
import "../../styles/global.css"


export default function BottomBar() {
    const navigate = useNavigate();

    return (
        <nav className="bottom-bar">
            <button onClick={() => navigate("/")}>🏠 Home</button>
            <button onClick={() => navigate("/cards")}>
                <img src={IconeBusca} alt="Buscar" width={25} height={25} />
                Busca

            </button>

            {/* Botão central da câmera */}
            <button className="scan-button" onClick={() => navigate("/scan")}>
                📷
            </button>

            <button onClick={() => navigate("/collection")}>💼 Coleção</button>
        </nav>
    );
}