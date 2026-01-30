import "./camera.css";

type Props = {
    onCapture: () => void;
    disabled?: boolean;
};

/**
 * Botão de captura de imagem
 * Renderiza o botão circular amarelo na parte inferior
 */
export function CaptureButton({ onCapture, disabled = false }: Props) {
    return (
        <button
            onClick={onCapture}
            disabled={disabled}
            className="capture-button"
            aria-label="Capturar carta"
        >
            ●
        </button>
    );
}