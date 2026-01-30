import "./camera.css";

/**
 * Componente de overlay visual
 * Renderiza o frame de captura e a linha animada
 */
export function ScanOverlay() {
    return (
        <div className="scan-overlay">
            {/* Frame de captura (retângulo proporcional a carta Pokémon) */}
            <div className="scan-frame">
                {/* Linha de scan animada */}
                <div className="scan-line" />
            </div>

            {/* Texto de instrução */}
            <p className="scan-text">Centralize a carta no quadro</p>
        </div>
    );
}