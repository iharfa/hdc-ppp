import { useMemo, useState } from "react";
import type { ParticipationRecord, ParticipationStatus, RecordFilters } from "../types";

// Ongoing first (public input needed now), then planned/upcoming, completed last.
const STATUS_ORDER: Record<ParticipationStatus, number> = {
  Ongoing: 0,
  Planned: 1,
  "Internal Review": 2,
  Closed: 3,
  Completed: 4,
};

export function sortRecords(records: ParticipationRecord[]): ParticipationRecord[] {
  return records
    .slice()
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.periodStart.localeCompare(a.periodStart));
}

export const emptyFilters: RecordFilters = {
  statuses: [],
  types: [],
  islandPhase: "all",
  department: "all",
  anonymousAllowed: "all",
  efaasRequired: "all",
  dateFrom: "",
  dateTo: "",
};

export function applyFilters(records: ParticipationRecord[], f: RecordFilters): ParticipationRecord[] {
  return records.filter((r) => {
    if (f.statuses.length && !f.statuses.includes(r.status)) return false;
    if (f.types.length && !f.types.includes(r.participationType)) return false;
    if (f.islandPhase !== "all" && r.islandPhase !== f.islandPhase) return false;
    if (f.department !== "all" && r.department !== f.department) return false;
    if (f.anonymousAllowed !== "all" && r.anonymousAllowed !== (f.anonymousAllowed === "yes")) return false;
    if (f.efaasRequired !== "all" && r.efaasRequired !== (f.efaasRequired === "yes")) return false;
    if (f.dateFrom && r.periodEnd < f.dateFrom) return false;
    if (f.dateTo && r.periodStart > f.dateTo) return false;
    return true;
  });
}

export function useRecordFilters(records: ParticipationRecord[]) {
  const [filters, setFilters] = useState<RecordFilters>(emptyFilters);
  const filtered = useMemo(() => sortRecords(applyFilters(records, filters)), [records, filters]);
  return { filters, setFilters, filtered };
}
