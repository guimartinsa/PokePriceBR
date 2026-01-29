export function Loading() {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '40px'
        }}>
            <div className="spinner">Carregando...</div>
        </div>
    );
}