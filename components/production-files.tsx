"use client";
import { useState } from "react";
import { Download, ChevronLeft, ChevronRight, Search } from "lucide-react";
import styles from "./production-files.module.css";
type Artifact = {
  id: string;
  kind: string;
  row_number: number;
  proof_id: string;
};
export function ProductionFiles({
  orderId,
  proofId,
  artifacts,
  state,
}: {
  orderId: string;
  proofId: string;
  artifacts: Artifact[];
  state?: string;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const rows = new Map<number, Artifact[]>();
  for (const a of artifacts)
    if (a.proof_id === proofId)
      rows.set(a.row_number, [...(rows.get(a.row_number) || []), a]);
  const matching = [...rows.entries()]
    .sort(([a], [b]) => a - b)
    .filter(
      ([n]) =>
        !query.trim() ||
        (/^\d+$/.test(query.trim()) && n === Number(query.trim())),
    );
  const pages = Math.max(1, Math.ceil(matching.length / 10)),
    current = Math.min(page, pages - 1);
  return (
    <details className={styles.files}>
      <summary>
        Production files{" "}
        <span>
          {rows.size} personalized {rows.size === 1 ? "row" : "rows"}
        </span>
      </summary>
      {!rows.size ? (
        <p>
          {state === "failed"
            ? "Rendering failed. Retry the job from Store management."
            : "Files are being prepared. Refresh when rendering completes."}
        </p>
      ) : (
        <>
          <label className={styles.search}>
            <Search size={16} />
            <input
              aria-label="Find production row"
              placeholder="Find a row number…"
              inputMode="numeric"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <div className={styles.list}>
            {matching
              .slice(current * 10, current * 10 + 10)
              .map(([row, files]) => (
                <div className={styles.row} key={row}>
                  <span>Row {String(row).padStart(3, "0")}</span>
                  <div>
                    {files
                      .sort((a, b) => a.kind.localeCompare(b.kind))
                      .map((a) => (
                        <a
                          key={a.id}
                          href={`/api/orders/${orderId}/files?artifact=${a.id}`}
                        >
                          <Download size={14} />
                          {a.kind.toUpperCase()}
                          <span className="sr-only"> for row {row}</span>
                        </a>
                      ))}
                  </div>
                </div>
              ))}
            {!matching.length && (
              <p role="status">
                No matching row.{" "}
                <button onClick={() => setQuery("")}>Show all rows</button>
              </p>
            )}
          </div>
          {pages > 1 && (
            <div className={styles.pagination}>
              <button
                aria-label="Previous production rows"
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <span aria-live="polite">
                Page {current + 1} of {pages}
              </span>
              <button
                aria-label="Next production rows"
                disabled={current === pages - 1}
                onClick={() => setPage(current + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </details>
  );
}
