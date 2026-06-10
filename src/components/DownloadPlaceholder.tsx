import { useState } from "react";

/** Placeholder dataset download buttons. Real exports arrive with the backend phase. */
export function DownloadPlaceholder() {
  const [msg, setMsg] = useState<string | null>(null);
  const items = ["Download summary PDF", "Download cleaned dataset CSV", "Download response matrix"];
  return (
    <div>
      <div className="panel-actions">
        {items.map((label) => (
          <button
            key={label}
            type="button"
            className="btn"
            onClick={() => setMsg(`${label}: placeholder only. Approved cleaned datasets will be exportable in the backend phase.`)}
          >
            ⬇ {label}
          </button>
        ))}
      </div>
      {msg && (
        <p className="muted" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}
