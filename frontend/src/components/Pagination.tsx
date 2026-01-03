interface PaginationProps {
  page: number;
  total: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  total,
  pageSize = 20,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      <button disabled={page === 1} onClick={() => onPageChange(page - 1)}>
        ◀
      </button>

      {start > 1 && <span>…</span>}

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          style={{
            fontWeight: p === page ? "bold" : "normal",
            background: p === page ? "#333" : "#fff",
            color: p === page ? "#fff" : "#000",
            borderRadius: 4,
            padding: "4px 8px",
          }}
        >
          {p}
        </button>
      ))}

      {end < totalPages && <span>…</span>}

      <button
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        ▶
      </button>
    </div>
  );
}
