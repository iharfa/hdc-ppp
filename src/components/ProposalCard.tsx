import { Link } from "react-router-dom";
import type { CommunityProposal, ProposalStatus } from "../types";
import { PROPOSAL_STATUS_LABEL } from "../types";

export function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
  return <span className={`status-badge pstatus-${status}`}>{PROPOSAL_STATUS_LABEL[status]}</span>;
}

/** Card for the community ideas list and the home page. */
export function ProposalCard({ proposal }: { proposal: CommunityProposal }) {
  const image = proposal.photos[0] ?? proposal.sketches[0];
  return (
    <article className="project-card">
      {image ? (
        <Link to={`/ideas/${proposal.proposalId}`} className="pc-media" tabIndex={-1} aria-hidden="true">
          <img src={image.dataUrl} alt="" loading="lazy" />
        </Link>
      ) : (
        <div className="pc-media pc-media-empty" aria-hidden="true">
          <span className="pc-media-label">{proposal.category}</span>
        </div>
      )}
      <div className="pc-body">
        <p className="pc-kicker">
          <ProposalStatusBadge status={proposal.status} />
          <span>{proposal.category}</span>
        </p>
        <h3 className="pc-title">
          <Link to={`/ideas/${proposal.proposalId}`}>{proposal.title}</Link>
        </h3>
        <p className="pc-summary">{proposal.whatChanges}</p>
        <p className="pc-meta muted">
          {proposal.locationText} · <span className="nowrap">{proposal.supports} {proposal.supports === 1 ? "support" : "supports"}</span>
        </p>
        <Link className="btn" to={`/ideas/${proposal.proposalId}`}>
          {proposal.status === "invited-co-create" ? "See how to join" : "Read and support"}
        </Link>
      </div>
    </article>
  );
}
