import { useState } from "react";
import { Link } from "react-router-dom";
import type { CommunityProposal, ParticipationRecord, ProposalStatus, SurveyQuestion } from "../types";
import { PROPOSAL_STATUS_LABEL } from "../types";
import { getProposals, nextRecordId, places } from "../services/dataService";
import { saveCreatedRecord, saveProposalOverride } from "../services/storage";
import { ProposalStatusBadge } from "./ProposalCard";

interface Props {
  actor: string;
  defaultQuestions(): SurveyQuestion[];
  onRecordCreated(): void;
}

const NEXT: Record<ProposalStatus, ProposalStatus[]> = {
  submitted: ["under-review", "not-taken-forward"],
  "under-review": ["invited-co-create", "taken-up", "not-taken-forward"],
  "invited-co-create": ["taken-up", "not-taken-forward"],
  "taken-up": [],
  "not-taken-forward": ["under-review"],
};

/** Admin review of community proposals: status decisions, co-create invitations, take-up as a record. */
export function ProposalReview({ actor, defaultQuestions, onRecordCreated }: Props) {
  const [proposals, setProposals] = useState(getProposals);
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const refresh = () => setProposals(getProposals());
  const today = () => new Date().toISOString().slice(0, 10);

  function decide(p: CommunityProposal, status: ProposalStatus) {
    if (status === "taken-up") return takeUp(p);
    saveProposalOverride({ proposalId: p.proposalId, status, statusNote: note.trim() || p.statusNote });
    setNote("");
    refresh();
  }

  function takeUp(p: CommunityProposal) {
    const place = places.find((x) => x.canonicalPlaceId === p.canonicalPlaceId) ?? places[0];
    const record: ParticipationRecord = {
      recordId: nextRecordId(),
      title: p.title,
      status: "Internal Review",
      participationType: "Public consultation",
      canonicalPlaceId: place.canonicalPlaceId,
      locationName: p.locationText || place.displayName,
      knownReferences: place.aliases.map((a) => a.value),
      islandPhase: p.islandPhase,
      department: "Socio-Environmental Planning",
      responsibleSection: "Socio-Environmental Planning Section",
      relatedDepartments: [],
      periodStart: today(),
      periodEnd: today(),
      summary: `${p.whatChanges} (Taken up from community idea ${p.proposalId}.)`,
      whyParticipation: p.benefit,
      documents: [],
      timeline: [{ date: today(), label: "Record drafted", description: `Taken up from community idea ${p.proposalId} by ${actor} (POC admin preview).` }],
      surveyQuestions: defaultQuestions(),
      workflowStage: "draft",
      sampleData: true,
    };
    saveCreatedRecord(record);
    saveProposalOverride({ proposalId: p.proposalId, status: "taken-up", statusNote: note.trim() || `Taken up as ${record.recordId}. Set its dates and survey in the registry.`, linkedRecordId: record.recordId });
    setNote("");
    refresh();
    onRecordCreated();
  }

  const pending = proposals.filter((p) => p.status === "submitted").length;

  return (
    <>
      <p className="muted">
        {pending} new {pending === 1 ? "idea" : "ideas"} awaiting first review. Decisions and notes are saved in this browser (POC). Contact details are
        only visible here.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Idea</th>
              <th scope="col">Status</th>
              <th scope="col">Supports</th>
              <th scope="col">Co-create?</th>
              <th scope="col">Submitted</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {proposals.map((p) => (
              <tr key={p.proposalId}>
                <td>
                  <Link to={`/ideas/${p.proposalId}`}>{p.title}</Link>
                  <br />
                  <span className="alias-tag">{p.proposalId}</span> <span className="muted">{p.category} · {p.islandPhase}</span>
                </td>
                <td><ProposalStatusBadge status={p.status} /></td>
                <td>{p.supports}</td>
                <td>{p.wantsToCoCreate ? <span className="ok-text">Yes</span> : <span className="muted">No</span>}</td>
                <td>{p.submittedAt}<br /><span className="muted">{p.submitterName || "Anonymous"}</span></td>
                <td>
                  {NEXT[p.status].length > 0 ? (
                    <button type="button" className="btn btn-sm" onClick={() => { setOpen(open === p.proposalId ? null : p.proposalId); setNote(""); }} aria-expanded={open === p.proposalId}>
                      {open === p.proposalId ? "Close" : "Review"}
                    </button>
                  ) : (
                    <span className="muted">
                      {p.linkedRecordId ? <Link to={`/records/${p.linkedRecordId}`}>Open record</Link> : "Decided"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (() => {
        const p = proposals.find((x) => x.proposalId === open);
        if (!p) return null;
        return (
          <div className="card review-panel">
            <h3>{p.title}</h3>
            <dl className="review-list">
              <div><dt>What would change</dt><dd>{p.whatChanges}</dd></div>
              <div><dt>Benefit</dt><dd>{p.benefit}</dd></div>
              {p.impact && <div><dt>Impacts</dt><dd>{p.impact}</dd></div>}
              <div><dt>Location</dt><dd>{p.locationText} {p.pin && <span className="alias-tag">{p.pin}</span>}</dd></div>
              <div><dt>Submitter</dt><dd>{p.submitterName || "Anonymous"}{p.contact ? ` · contact: ${p.contact}` : " · no contact left"}{p.wantsToCoCreate ? " · wants to co-create" : ""}</dd></div>
              {(p.photos.length > 0 || p.sketches.length > 0) && (
                <div>
                  <dt>Images</dt>
                  <dd>
                    <ul className="image-grid">
                      {[...p.photos, ...p.sketches].map((img, i) => (
                        <li key={i}><img src={img.dataUrl} alt={img.name} /></li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
            </dl>
            <div className="form-field">
              <label htmlFor="rv-note">Note shown publicly with the status</label>
              <textarea id="rv-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={p.statusNote || "e.g. Estate is checking the construction schedule for this lot."} />
            </div>
            <div className="panel-actions">
              {NEXT[p.status].map((s) => (
                <button key={s} type="button" className={`btn ${s === "invited-co-create" || s === "taken-up" ? "btn-primary" : ""}`} onClick={() => decide(p, s)}>
                  {s === "taken-up" ? "Take up as participation record" : s === "invited-co-create" ? "Invite to co-create" : `Mark ${PROPOSAL_STATUS_LABEL[s].toLowerCase()}`}
                </button>
              ))}
            </div>
          </div>
        );
      })()}
    </>
  );
}
