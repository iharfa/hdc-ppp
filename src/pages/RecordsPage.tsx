import { Link } from "react-router-dom";
import { records } from "../services/dataService";
import { useRecordFilters } from "../hooks/useRecordFilters";
import { FiltersSidebar } from "../components/FiltersSidebar";
import { StatusBadge } from "../components/StatusBadge";
import { DecisionStatusIcon } from "../components/DecisionStatusIcon";

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
            <article className={`card record-card ${r.status === "Completed" ? "completed" : ""}`} key={r.recordId} style={{ marginTop: 0 }}>
              {r.image && (
                <>
                  <img
                    className="rc-image"
                    src={r.image}
                    alt={`Concept illustration for ${r.title}`}
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <p className="rc-image-caption">Representative image — illustrative only, not an approved design</p>
                </>
              )}
              <div className="rc-body">
                <span>
                  <StatusBadge status={r.status} />
                </span>
                <h2 style={{ margin: "0.4rem 0 0.2rem", fontSize: "1.05rem" }}>
                  <Link to={`/records/${r.recordId}`} style={{ color: "var(--hdc-blue)" }}>
                    {r.title}
                  </Link>
                </h2>
                <p className="muted" style={{ margin: "0.2rem 0" }}>
                  {r.participationType} · {r.locationName} · {r.periodStart} to {r.periodEnd}
                </p>
                <p style={{ fontSize: "0.88rem", margin: "0.4rem 0" }}>{r.summary}</p>
                {r.status === "Completed" && r.decision && (
                  <div className="rc-result">
                    <div className="rc-result-head">
                      <DecisionStatusIcon status={r.decision.decisionStatus} size={20} />
                      <span className="rc-result-status">Result: {r.decision.decisionStatus}</span>
                      <span className="muted">({r.decision.decidedOn})</span>
                    </div>
                    {r.decision.conclusion.replace("SAMPLE DECISION (POC): ", "").split(". ").slice(0, 2).join(". ")}.
                    <span className="muted"> Sample decision.</span>
                  </div>
                )}
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
                      View full results
                    </Link>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
