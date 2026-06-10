import { Link } from "react-router-dom";
import { records } from "../services/dataService";
import { useRecordFilters } from "../hooks/useRecordFilters";
import { FiltersSidebar } from "../components/FiltersSidebar";
import { StatusBadge } from "../components/StatusBadge";

export function RecordsPage() {
  const { filters, setFilters, filtered } = useRecordFilters(records);
  return (
    <div className="page">
      <h1>Participation Records</h1>
      <p className="muted">All public participation processes across HDC-managed areas. Sample POC data.</p>
      <div style={{ border: "1px solid var(--grey-300)", borderRadius: 8, marginBottom: "1rem" }}>
        <FiltersSidebar filters={filters} onChange={setFilters} resultCount={filtered.length} />
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state">No participation records match the current filters.</div>
      ) : (
        <div className="grid-2">
          {filtered.map((r) => (
            <div className="card" key={r.recordId} style={{ marginTop: 0 }}>
              <StatusBadge status={r.status} />
              <h2 style={{ marginTop: "0.4rem", fontSize: "1.05rem" }}>
                <Link to={`/records/${r.recordId}`} style={{ color: "var(--hdc-blue)" }}>
                  {r.title}
                </Link>
              </h2>
              <p className="muted">
                {r.participationType} · {r.locationName} · {r.periodStart} to {r.periodEnd}
              </p>
              <p style={{ fontSize: "0.88rem" }}>{r.summary}</p>
              <div className="panel-actions">
                <Link className="btn btn-sm" to={`/records/${r.recordId}`}>
                  Details
                </Link>
                {r.status === "Ongoing" && (
                  <Link className="btn btn-sm btn-primary" to={`/records/${r.recordId}/respond`}>
                    Respond
                  </Link>
                )}
                {r.status === "Completed" && (
                  <Link className="btn btn-sm btn-blue" to={`/results/${r.recordId}`}>
                    View results
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
