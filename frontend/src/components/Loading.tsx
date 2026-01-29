export function Loading() {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "40px",
                minHeight: "200px",
            }}
        >
            <div className="spinner">
                <div
                    style={{
                        width: "40px",
                        height: "40px",
                        border: "4px solid rgba(255, 255, 255, 0.1)",
                        borderTop: "4px solid #f6c400",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                    }}
                />
            </div>
            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}
            </style>
        </div>
    );
}