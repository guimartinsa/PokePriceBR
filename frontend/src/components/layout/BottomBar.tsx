import { useNavigate } from "react-router-dom";
import IconeBusca from "../../assets/icons/busca-icon.svg";
import IconeCamera from "../../assets/icons/camera-pokemon.svg";
import IconeColecao from "../../assets/icons/colecaoicon.svg";
import IconHome from "../../assets/icons/home-icon.svg";
import WishlistIcon from "../../assets/icons/wishlist-icon.svg";
import CheckballIcon from "../../assets/icons/checkball-icon.svg";
import { usePwaInstall } from "../../hooks/usePwaInstall";


import "../../styles/global.css";


export default function BottomBar() {
    const navigate = useNavigate();
    const { canInstall, install } = usePwaInstall();

    return (
        <nav id="tour-bottom-bar" className="bottom-bar">
            <button id="tour-bottom-home" aria-label="Ir para a página inicial" onClick={() => navigate("/")}>
                <img src={IconHome} alt="" width={45} height={45} />
            </button>

            <button id="tour-bottom-search" aria-label="Buscar cartas" onClick={() => navigate("/cards")}>
                <img src={IconeBusca} alt="Buscar" width={45} height={45} />
            </button>

            {/* Botão central da câmera */}
            <button id="tour-bottom-scan" aria-label="Escanear carta" className="scan-button" onClick={() => navigate("/scan")}>
                <img src={IconeCamera} alt="" width={45} height={45} />
            </button>

            <button id="tour-bottom-series" aria-label="Ver séries" onClick={() => navigate("/series")}>
                <img src={WishlistIcon} alt="" width={45} height={45} />
            </button>

            <button aria-label="Ver artistas" onClick={() => navigate("/artists")}>
                <img src={CheckballIcon} alt="" width={42} height={42} />
            </button>

            <button id="tour-bottom-collection" aria-label="Abrir coleções" onClick={() => navigate("/collection")}>
                <img src={IconeColecao} alt="" width={35} height={35} />
            </button>

            {canInstall && (
                <button
                    aria-label="Instalar aplicativo"
                    id="tour-install-pwa" className="install-app-button"
                    onClick={() => void install()}
                    title="Instalar PWA"
                >
                    <span aria-hidden="true">⬇️</span>
                    <small>Instalar</small>
                </button>
            )}
        </nav>
    );
}
