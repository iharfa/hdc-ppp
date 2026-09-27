import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProposal, getRecord } from "../services/dataService";
import { getSupportedIds, toggleSupport } from "../services/storage";
import { ProposalStatusBadge } from "../components/ProposalCard";
import { MapFallback } from "../components/MapFallback";

const STATUS_EXPLAINER: Record<string, string> = {
  submitted: "Waiting for HDC staff to review.",
  "under-review": "HDC is checking feasibility with the relevant departments.",
  "invited-co-create": "HDC has invited the submitter and supporters to help shape this idea.",
  "taken-up": "HDC has taken this idea up as a participation project.",
  "not-taken-forward": "HDC will not progress this idea for now; the reason is noted below.",
};

export function IdeaDetailPage() {
  const { proposalId } = useParams();
  const [supported, setSupported] = useState(() => (proposalId ? getSupportedIds().includes(proposalId) : false));
  const [tick, setTick] = useState(0);
  const proposal = proposalId ? getProposal(proposalId) : undefined;
  void tick;

  if (!proposal) {
    return (
      <div className="page">
        <div className="empty-state">
          Idea not found. <Link to="/ideas">Back to community ideas</Link>
        </div>
      </div>
    );
  }
  const linked = proposal.linkedRecordId ? getRecord(proposal.linkedRecordId) : undefined;
  const images = [...proposal.photos.map((p) => ({ ...p, kind: "Photo" })), ...proposal.sketches.map((s) => ({ ...s, kind: "Sketch" }))];
  const pin = proposal.pin.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);

  function support() {
    setSupported(toggleSupport(proposal!.proposalId));
    setTick((t) => t + 1);
  }

  return (
    <div className="page">
      <ProposalStatusBadge status={proposal.status} /> <span className="muted">{proposal.category} · {proposal.islandPhase}</span>
      <h1>{proposal.title}</h1>
      <p className="muted">
        Suggested {proposal.submittedAt} by {proposal.submitterName || "an anonymous resident"}
        {proposal.sample ? " · Sample idea" : ""}
      </p>

      <div className="grid-2">
        <div>
          <div className="card">
            <h2 className="card-title">What would change</h2>
            <p>{proposal.whatChanges}</p>
            <h2>How it would benefit the community</h2>
            <p>{proposal.benefit}</p>
            {proposal.impact && (
              <>
                <h2>Impacts and trade-offs</h2>
                <p>{proposal.impact}</p>
              </>
            )}
          </div>
          {images.length > 0 && (
            <div className="card">
              <h2 className="card-title">Photos and sketches</h2>
              <ul className="image-grid image-grid-lg">
                {images.map((img, i) => (
                  <li key={i}>
                    <img src={img.dataUrl} alt={`${img.kind}: ${img.name}`} />
                    <span className="muted">{img.kind}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <div className="card idea-status-card">
            <h2 className="card-title">Status</h2>
            <p>
              <ProposalStatusBadge status={proposal.status} />
            </p>
            <p>{STATUS_EXPLAINER[proposal.status]}</p>
            {proposal.statusNote && <p className="idea-note">{proposal.statusNote}</p>}
            {proposal.status === "invited-co-create" && (
              <p>
                Want to join? Mark your support below and use the contact you left with your idea, or reach the
                Socio-Environmental Planning Section through HDC. Co-creation sessions are announced on the idea page.
              </p>
            )}
            {linked && (
              <p>
                Now running as{" "}
                <Link to={`/records/${linked.recordId}`}>
                  {linked.title}
                </Link>
                .
              </p>
            )}
            <div className="support-row">
              <button type="button" className={`btn ${supported ? "" : "btn-primary"}`} onClick={support} aria-pressed={supported}>
                {supported ? "Supported" : "Support this idea"}
              </button>
              <span className="support-count">
                <strong>{proposal.supports}</strong> {proposal.supports === 1 ? "support" : "supports"}
              </span>
            </div>
            <p className="muted">One support per browser in this proof of concept.</p>
          </div>

          <div className="card">
            <h2 className="card-title">Location</h2>
            <p>{proposal.locationText || "Pin only"}</p>
            {pin && (
              <>
                <p><span className="alias-tag">{proposal.pin}</span></p>
                <div className="location-preview">
                  <MapFallback
                    message="Schematic location of the idea (POC)."
                    records={[]}
                    selectedId={null}
                    onSelect={() => {}}
                    extraPin={{ lon: Number(pin[2]), lat: Number(pin[1]), title: proposal.title }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="section-gap-lg">
        <Link className="btn" to="/ideas">Back to community ideas</Link>
      </p>
    </div>
  );
}
