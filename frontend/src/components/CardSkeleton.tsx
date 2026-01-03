export function CardSkeleton() {
  return (
    <li
      style={{
        border: "1px solid #eee",
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        background: "#f6f7f8",
        animation: "pulse 1.5s infinite",
      }}
    >
      <div style={{ width: "60%", height: 16, background: "#ddd", marginBottom: 8 }} />
      <div style={{ width: "40%", height: 12, background: "#ddd", marginBottom: 6 }} />
      <div style={{ width: "50%", height: 12, background: "#ddd" }} />
    </li>
  );
}
