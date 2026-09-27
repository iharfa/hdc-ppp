import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getProposals } from "../services/dataService";
import { PROPOSAL_STATUS_LABEL, type ProposalStatus } from "../types";
import { ProposalCard } from "../components/ProposalCard";

const STATUSES = Object.keys(PROPOSAL_STATUS_LABEL) as ProposalStatus[];

export function IdeasPage() {
  const proposals = useMemo(getProposals, []);
  const [status, setStatus] = useState<ProposalStatus | "all">("all");
  const [phase, setPhase] = useState("all");
  const phases = [...new Set(proposals.map((p) => p.islandPhase))];
  const shown = proposals.filter((p) => (status === "all" || p.status === status) && (phase === "all" || p.islandPhase === phase));

  return (
    <div className="page">
      <div className="ideas-head">
        <div>
          <h1>Community ideas</h1>
          <p className="muted">
            Changes residents want to see in Hulhumalé. Support the ones you agree with. HDC reviews every idea and can
            invite you to co-create it, or take it up as a participation project.
          </p>
        </div>
        <Link className="btn btn-primary" to="/ideas/new">
          Suggest a change
        </Link>
      </div>

      <div className="filters-inline">
        <div className="filters ideas-filters">
          <div className="filter-group">
            <span className="filter-label" id="idea-status-label">Status</span>
            <div className="filter-chips" role="group" aria-labelledby="idea-status-label">
              <button type="button" className={`filter-chip ${status === "all" ? "on" : ""}`} aria-pressed={status === "all"} onClick={() => setStatus("all")}>
                All
              </button>
              {STATUSES.map((s) => (
                <button key={s} type="button" className={`filter-chip ${status === s ? "on" : ""}`} aria-pressed={status === s} onClick={() => setStatus(s)}>
                  {PROPOSAL_STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group filter-row">
            <label>
              Island or phase
              <select value={phase} onChange={(e) => setPhase(e.target.value)}>
                <option value="all">All</option>
                {phases.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="empty-state">No ideas match these filters yet.</div>
      ) : (
        <div className="grid-3">
          {shown.map((p) => (
            <ProposalCard key={p.proposalId} proposal={p} />
          ))}
        </div>
      )}
    </div>
  );
}
