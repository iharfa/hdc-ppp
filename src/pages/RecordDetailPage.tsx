import { Link, useParams } from "react-router-dom";
import { getRecord, getPlace } from "../services/dataService";
import { StatusBadge } from "../components/StatusBadge";
import { WorkflowPipeline } from "../components/WorkflowPipeline";
import { MapFallback } from "../components/MapFallback";
import { downloadPlaceholderDoc } from "../utils/placeholderDoc";
import { useState } from "react";

export function RecordDetailPage() {
  const { recordId } = useParams();
  const record = recordId ? getRecord(recordId) : undefined;
  const [showPreview, setShowPreview] = useState(false);
  const [showMoreMeta, setShowMoreMeta] = useState(false);

  if (!record) {
    return (
      <div className="page">
        <div className="empty-state">
          Participation record not found. <Link to="/records">Back to all records</Link>
        </div>
      </div>
    );
  }
  const place = getPlace(record.canonicalPlaceId);

  return (
    <div className="page">
      <StatusBadge status={record.status} /> <span className="muted">{record.participationType} · Sample POC data</span>
      <h1>{record.title}</h1>

      <div className="grid-2">
        <div className="card" style={{ marginTop: 0 }}>
          {record.image && (
            <>
              <img
                src={record.image}
                alt={`Concept illustration for ${record.title}`}
                style={{ width: "100%", borderRadius: 6, display: "block" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <p className="muted" style={{ fontSize: "0.7rem", margin: "0.2rem 0 0.6rem" }}>
                Representative image — illustrative only, not an approved design
              </p>
            </>
          )}
          <h2 style={{ marginTop: 0 }}>Project summary</h2>
          <p>{record.summary}</p>
          <h2>Why public participation is needed</h2>
          <p>{record.whyParticipation}</p>
          <dl className="detail-panel" style={{ border: "none", padding: 0 }}>
            <dt>Location</dt>
            <dd>{record.locationName}</dd>
            <dt>Participation period</dt>
            <dd>{record.periodStart} to {record.periodEnd}</dd>
            <dt>Verification mode</dt>
            <dd>{record.verificationMode}</dd>
            {showMoreMeta && (
              <>
                <dt>Canonical place ID</dt>
                <dd><span className="alias-tag">{record.canonicalPlaceId}</span></dd>
                <dt>Known references</dt>
                <dd>
                  {record.knownReferences.map((ref) => (
                    <span key={ref} className="alias-tag" style={{ marginRight: 4 }}>{ref}</span>
                  ))}
                </dd>
                <dt>Responsible section</dt>
                <dd>{record.responsibleSection}</dd>
                <dt>Related departments</dt>
                <dd>{record.relatedDepartments.join(", ")}</dd>
                <dt>Island / phase</dt>
                <dd>{record.islandPhase}</dd>
              </>
            )}
          </dl>
          <button
            type="button"
            className="link-toggle"
            aria-expanded={showMoreMeta}
            onClick={() => setShowMoreMeta((v) => !v)}
          >
            {showMoreMeta ? "View less ▲" : "View more details ▼"}
          </button>
          <div className="panel-actions">
            {record.status === "Ongoing" && (
              <Link className="btn btn-primary" to={`/records/${record.recordId}/respond`}>
                Respond to this survey
              </Link>
            )}
            {record.status === "Completed" && (
              <Link className="btn btn-blue" to={`/results/${record.recordId}`}>
                View results and decision
              </Link>
            )}
            <button type="button" className="btn" onClick={() => setShowPreview((v) => !v)}>
              {showPreview ? "Hide" : "Show"} location preview
            </button>
          </div>
          {showPreview && place && (
            <div style={{ height: 320, marginTop: "0.8rem", border: "1px solid var(--grey-300)", borderRadius: 8, overflow: "hidden" }}>
              <MapFallback
                message="Schematic location preview (POC)."
                records={[record]}
                selectedId={record.recordId}
                onSelect={() => {}}
              />
            </div>
          )}
        </div>

        <div>
          <div className="card" style={{ marginTop: 0 }}>
            <h2 style={{ marginTop: 0 }}>Participation timeline</h2>
            <ul className="timeline">
              {record.timeline.map((t) => (
                <li key={`${t.date}-${t.label}`}>
                  <span className="tl-date">{t.date}</span>
                  <span>
                    <strong>{t.label}</strong>
                    {t.description && (
                      <>
                        <br />
                        <span className="muted">{t.description}</span>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Documents</h2>
            {record.documents.length === 0 ? (
              <div className="empty-state">No documents published yet.</div>
            ) : (
              <ul className="doc-list">
                {record.documents.map((d) => (
                  <li key={d.title} className="doc-item">
                    <span className="doc-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="36" height="36">
                        <path
                          fill="#0b3a6f"
                          d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
                        />
                        <path fill="#0e7c86" d="M14 2l4 4h-4z" />
                        <text x="11.5" y="17" textAnchor="middle" fontSize="6" fill="#fff" fontFamily="sans-serif" fontWeight="bold">
                          {d.type}
                        </text>
                      </svg>
                    </span>
                    <span className="doc-meta">
                      <span className="doc-title">{d.title}</span>
                      <span className="muted">{d.type} · {d.sizeLabel} · sample placeholder</span>
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => downloadPlaceholderDoc(d.title, record.title)}
                    >
                      ⬇ Download
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Survey questions</h2>
            {record.surveyQuestions.length === 0 ? (
              <div className="empty-state">Survey not yet published for this record.</div>
            ) : (
              <ol style={{ paddingLeft: "1.2rem", fontSize: "0.88rem" }}>
                {record.surveyQuestions.map((q) => (
                  <li key={q.id}>
                    {q.label} <span className="muted">({q.type}{q.required ? ", required" : ""})</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>

      <h2>Workflow stage</h2>
      <div className="card">
        <WorkflowPipeline currentStepId={record.workflowStage} />
      </div>
    </div>
  );
}
