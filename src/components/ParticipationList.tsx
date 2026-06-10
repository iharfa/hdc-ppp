import type { ParticipationRecord } from "../types";
import { StatusBadge } from "./StatusBadge";

interface Props {
  records: ParticipationRecord[];
  selectedId: string | null;
  onSelect(recordId: string): void;
}

export function ParticipationList({ records, selectedId, onSelect }: Props) {
  if (records.length === 0) {
    return <div className="empty-state">No participation records match the current filters.</div>;
  }
  return (
    <ul className="record-list">
      {records.map((r) => (
        <li key={r.recordId} className={r.recordId === selectedId ? "selected" : ""}>
          <button type="button" className="record-item" onClick={() => onSelect(r.recordId)}>
            <span className="ri-title">{r.title}</span>
            <span className="ri-meta">
              <StatusBadge status={r.status} />
              <span>{r.participationType}</span>
              <span>{r.locationName}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
