import type { ParticipationStatus, ParticipationType, RecordFilters } from "../types";
import { records } from "../services/dataService";
import { emptyFilters } from "../hooks/useRecordFilters";

const STATUSES: ParticipationStatus[] = ["Ongoing", "Completed", "Planned", "Internal Review", "Closed"];
const TYPES: ParticipationType[] = [
  "Public consultation",
  "Survey",
  "Development notice",
  "Design feedback",
  "Planning disclosure",
  "Environmental and social feedback",
  "Road and mobility feedback",
  "Public space feedback",
];

interface Props {
  filters: RecordFilters;
  onChange(filters: RecordFilters): void;
  resultCount: number;
}

export function FiltersSidebar({ filters, onChange, resultCount }: Props) {
  const phases = [...new Set(records.map((r) => r.islandPhase))];
  const departments = [...new Set(records.map((r) => r.department))];

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  return (
    <details className="filters" open>
      <summary>
        Filters <span className="muted">({resultCount} shown)</span>
      </summary>
      <div className="filter-group">
        <span className="filter-label" id="filter-status-label">Status</span>
        <div className="filter-chips" role="group" aria-labelledby="filter-status-label">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={`filter-chip ${filters.statuses.includes(s) ? "on" : ""}`}
              aria-pressed={filters.statuses.includes(s)}
              onClick={() => onChange({ ...filters, statuses: toggle(filters.statuses, s) })}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="filter-group">
        <span className="filter-label" id="filter-type-label">Participation type</span>
        <div className="filter-chips" role="group" aria-labelledby="filter-type-label">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={`filter-chip ${filters.types.includes(t) ? "on" : ""}`}
              aria-pressed={filters.types.includes(t)}
              onClick={() => onChange({ ...filters, types: toggle(filters.types, t) })}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="filter-group filter-row">
        <label>
          Island or phase
          <select value={filters.islandPhase} onChange={(e) => onChange({ ...filters, islandPhase: e.target.value })}>
            <option value="all">All</option>
            {phases.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          Department
          <select value={filters.department} onChange={(e) => onChange({ ...filters, department: e.target.value })}>
            <option value="all">All</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="filter-group filter-row">
        <label>
          Anonymous allowed
          <select
            value={filters.anonymousAllowed}
            onChange={(e) => onChange({ ...filters, anonymousAllowed: e.target.value as RecordFilters["anonymousAllowed"] })}
          >
            <option value="all">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        <label>
          eFaas verification required
          <select
            value={filters.efaasRequired}
            onChange={(e) => onChange({ ...filters, efaasRequired: e.target.value as RecordFilters["efaasRequired"] })}
          >
            <option value="all">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
      </div>
      <div className="filter-group filter-row">
        <label>
          From date
          <input type="date" value={filters.dateFrom} onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })} />
        </label>
        <label>
          To date
          <input type="date" value={filters.dateTo} onChange={(e) => onChange({ ...filters, dateTo: e.target.value })} />
        </label>
      </div>
      <div className="filter-group">
        <button type="button" className="btn btn-sm" onClick={() => onChange(emptyFilters)}>
          Clear all filters
        </button>
      </div>
    </details>
  );
}
