import { Link } from "react-router-dom";
import type { ParticipationRecord } from "../types";
import { StatusBadge } from "./StatusBadge";

interface Props {
  record: ParticipationRecord;
  kicker?: string;
}

/** Call to action per status: participate while open, results when decided, learn more while planned. */
function cta(r: ParticipationRecord): { to: string; label: string; primary: boolean } {
  if (r.status === "Ongoing") return { to: `/records/${r.recordId}/respond`, label: "Participate", primary: true };
  if (r.status === "Completed") return { to: `/results/${r.recordId}`, label: "See the decision", primary: false };
  return { to: `/records/${r.recordId}`, label: "Get involved", primary: false };
}

/** Image-led project card used on the home page (featured band and phase grids). */
export function ProjectCard({ record, kicker }: Props) {
  const action = cta(record);
  return (
    <article className="project-card">
      {record.image ? (
        <Link to={`/records/${record.recordId}`} className="pc-media" tabIndex={-1} aria-hidden="true">
          <img src={record.image} alt="" loading="lazy" onError={(e) => ((e.currentTarget.parentElement as HTMLElement).style.display = "none")} />
        </Link>
      ) : (
        <div className="pc-media pc-media-empty" aria-hidden="true" />
      )}
      <div className="pc-body">
        <p className="pc-kicker">
          <StatusBadge status={record.status} />
          <span>{kicker ?? record.participationType}</span>
        </p>
        <h3 className="pc-title">
          <Link to={`/records/${record.recordId}`}>{record.title}</Link>
        </h3>
        <p className="pc-summary">{record.summary}</p>
        <p className="pc-meta muted">
          {record.locationName} · {record.status === "Planned" ? "Opens" : record.status === "Ongoing" ? "Closes" : "Closed"}{" "}
          <span className="nowrap">{record.status === "Planned" ? record.periodStart : record.periodEnd}</span>
        </p>
        <Link className={`btn ${action.primary ? "btn-primary" : ""}`} to={action.to}>
          {action.label}
        </Link>
      </div>
    </article>
  );
}
