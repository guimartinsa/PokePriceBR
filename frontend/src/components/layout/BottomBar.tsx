import { useNavigate } from "react-router-dom";
import IconeBusca from "../../assets/icons/busca-icon.svg";
import IconeCamera from "../../assets/icons/camera-pokemon.svg"; 
import IconeColecao from "../../assets/icons/colecaoicon.svg";
import IconHome from "../../assets/icons/home-icon.svg";
import PocketIcon from "../../assets/icons/poket9-logo.svg"


import "../../styles/global.css"


export default function BottomBar() {
    const navigate = useNavigate();

    return (
        <nav className="bottom-bar">
            <button onClick={() => navigate("/")}>
                <img src={IconHome} alt="" width={35} height={35} />
                

            </button>

            <button onClick={() => navigate("/cards")}>
                <img src={IconeBusca} alt="Buscar" width={35} height={35} />
                
            </button>

            {/* Botão central da câmera */}
            <button className="scan-button" onClick={() => navigate("/scan")}>
                <img src={IconeCamera} alt="" width={45} height={45} />
                
            </button>

            <button>
                <img src= {PocketIcon} alt="" width={35} height={35}/>
                
            </button>

            <button onClick={() => navigate("/collection")}>
                <img src={IconeColecao} alt="" width={35} height={35}/>
                
            </button>
        </nav>
    );
}

