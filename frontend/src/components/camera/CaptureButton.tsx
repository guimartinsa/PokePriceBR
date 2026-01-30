import "./camera.css";

type Props = {
    onCapture: () => void;
};

export function CaptureButton({ onCapture }: Props) {
    return (
        <button
            onClick={onCapture}
            className="capture-button"
            aria-label="Capturar carta"
        >
            ●
        </button>
    );
}