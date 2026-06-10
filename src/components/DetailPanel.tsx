import { Link } from "react-router-dom";
import type { ParticipationRecord } from "../types";
import { getPlace } from "../services/dataService";
import { StatusBadge } from "./StatusBadge";

interface Props {
  record: ParticipationRecord;
  onClose(): void;
}

export function DetailPanel({ record, onClose }: Props) {
  const place = getPlace(record.canonicalPlaceId);
  return (
    <section className="detail-panel" aria-label={`Details for ${record.title}`}>
      <button type="button" className="panel-close" onClick={onClose} aria-label="Close detail panel">
        ✕
      </button>
      <h3>{record.title}</h3>
      <StatusBadge status={record.status} />
      <dl>
        <dt>Location</dt>
        <dd>{record.locationName}</dd>
        <dt>Canonical place ID</dt>
        <dd>
          <span className="alias-tag">{record.canonicalPlaceId}</span>
        </dd>
        <dt>Known references</dt>
        <dd>
          {record.knownReferences.map((ref) => (
            <span key={ref} className="alias-tag" style={{ marginRight: 4 }}>
              {ref}
            </span>
          ))}
        </dd>
        <dt>Participation period</dt>
        <dd>
          {record.periodStart} to {record.periodEnd}
        </dd>
        <dt>Verification mode</dt>
        <dd>{record.verificationMode}</dd>
        <dt>Responsible section</dt>
        <dd>{record.responsibleSection}</dd>
        <dt>Place type</dt>
        <dd>{place?.placeType ?? "unknown"}</dd>
      </dl>
      <p style={{ fontSize: "0.85rem" }}>{record.summary}</p>
      <div>
        <span className="filter-label">Key documents</span>
        <ul className="alias-list">
          {record.documents.map((d) => (
            <li key={d.title}>
              📄 {d.title} <span className="muted">({d.type}, {d.sizeLabel})</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="panel-actions">
        <Link className="btn btn-sm" to={`/records/${record.recordId}`}>
          Full details
        </Link>
        {record.status === "Ongoing" && (
          <Link className="btn btn-sm btn-primary" to={`/records/${record.recordId}/respond`}>
            Respond to this survey
          </Link>
        )}
        {record.status === "Completed" && (
          <Link className="btn btn-sm btn-blue" to={`/results/${record.recordId}`}>
            View results
          </Link>
        )}
      </div>
    </section>
  );
}
