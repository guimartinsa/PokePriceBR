import "./camera.css";

export function ScanOverlay() {
    return (
        <div className="scan-overlay">
            <div className="scan-frame">
                <div className="scan-line" />
            </div>

            <p className="scan-text">Centralize a carta no quadro</p>
        </div>
    );
}