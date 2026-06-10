import type { ParticipationStatus } from "../types";

/** Status badge with text label (never colour alone). */
export function StatusBadge({ status }: { status: ParticipationStatus }) {
  const cls = `status-badge status-${status.replace(/\s+/g, "")}`;
  return <span className={cls}>{status}</span>;
}
