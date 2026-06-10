import type { DecisionStatus } from "../types";

const STATUS_CLASS: Record<DecisionStatus, string> = {
  Approved: "decision-approved",
  "Approved with amendments": "decision-amended",
  "Partially approved": "decision-partial",
  Rejected: "decision-rejected",
  Deferred: "decision-deferred",
};

/** Decision outcome card shown at the top right of a published conclusion. */
export function DecisionStatusCard({ status, decidedOn }: { status: DecisionStatus; decidedOn: string }) {
  return (
    <div className={`decision-status-card ${STATUS_CLASS[status]}`} role="status" aria-label={`Decision outcome: ${status}`}>
      <span className="dsc-label">Decision outcome</span>
      <span className="dsc-status">{status}</span>
      <span className="dsc-date">{decidedOn}</span>
    </div>
  );
}
