import { useState } from "react";
import { Link } from "react-router-dom";
import { records, roles, places, moderationItems } from "../services/dataService";
import { getAdminDrafts, saveAdminDraft } from "../services/storage";
import { Logo } from "../components/Logo";
import { StatusBadge } from "../components/StatusBadge";
import { WorkflowPipeline } from "../components/WorkflowPipeline";
import { RoleMatrix } from "../components/RoleMatrix";
import { ModerationQueue } from "../components/ModerationQueue";
import { HarmonizationTable } from "../components/HarmonizationTable";

const TABS = [
  "Participation registry",
  "Create record",
  "GIS linking",
  "Survey builder",
  "Moderation queue",
  "Results review",
  "Conclusion publishing",
  "ID harmonization",
  "Role access matrix",
  "Workflow pipeline",
] as const;
type Tab = (typeof TABS)[number];

// Which tabs each role can meaningfully use (POC visual cue only).
const ROLE_TABS: Record<string, Tab[]> = {
  "public-viewer": ["Participation registry"],
  "public-respondent": ["Participation registry"],
  "spes-officer": ["Participation registry", "Create record", "Survey builder", "Results review", "Conclusion publishing", "Workflow pipeline"],
  "participation-manager": ["Participation registry", "Create record", "Survey builder", "Results review", "Workflow pipeline"],
  "gis-steward": ["Participation registry", "GIS linking", "ID harmonization"],
  moderator: ["Participation registry", "Moderation queue"],
  "dept-reviewer": ["Participation registry", "Workflow pipeline"],
  "senior-approver": ["Participation registry", "Conclusion publishing", "Workflow pipeline"],
  "system-admin": [...TABS],
};

export function AdminPage() {
  const [tab, setTab] = useState<Tab>("Participation registry");
  const [roleId, setRoleId] = useState("spes-officer");
  const [drafts, setDrafts] = useState(getAdminDrafts());
  const [draftForm, setDraftForm] = useState({ title: "", participationType: "Public consultation", summary: "", locationName: "" });
  const [savedMsg, setSavedMsg] = useState("");
  const allowedTabs = ROLE_TABS[roleId] ?? [];
  const role = roles.find((r) => r.roleId === roleId);

  function saveDraft() {
    if (!draftForm.title.trim()) return;
    saveAdminDraft({ draftId: `DRAFT-${Date.now()}`, ...draftForm, createdAt: new Date().toISOString().slice(0, 10) });
    setDrafts(getAdminDrafts());
    setDraftForm({ title: "", participationType: "Public consultation", summary: "", locationName: "" });
    setSavedMsg("Draft saved to localStorage (POC). In production this enters the Draft workflow stage.");
  }

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <Logo dark />
        <h1 style={{ margin: 0 }}>Admin Preview</h1>
      </div>
      <p className="muted">
        Frontend-only preview of HDC staff workflows. No authentication in this POC; role-based access control will be
        enforced server-side in the backend phase. Sample POC data only.
      </p>

      <div className="role-select">
        <label htmlFor="role-select">
          <strong>Preview as role:</strong>
        </label>
        <select id="role-select" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
          {roles.map((r) => (
            <option key={r.roleId} value={r.roleId}>
              {r.name}
            </option>
          ))}
        </select>
        {role && <span className="muted">{role.description}</span>}
      </div>

      <div className="admin-tabs" role="tablist" aria-label="Admin screens">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
            disabled={!allowedTabs.includes(t)}
            title={allowedTabs.includes(t) ? t : `Not available for role: ${role?.name}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Participation registry" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Participation registry</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Record</th>
                  <th scope="col">Status</th>
                  <th scope="col">Type</th>
                  <th scope="col">Workflow stage</th>
                  <th scope="col">Period</th>
                  <th scope="col">Place</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.recordId}>
                    <td>
                      <Link to={`/records/${r.recordId}`}>{r.title}</Link>
                      <br />
                      <span className="alias-tag">{r.recordId}</span>
                    </td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>{r.participationType}</td>
                    <td>{r.workflowStage}</td>
                    <td>{r.periodStart} – {r.periodEnd}</td>
                    <td><span className="alias-tag">{r.canonicalPlaceId}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "Create record" && (
        <div className="card survey-step">
          <h2 style={{ marginTop: 0 }}>Create participation record (Draft stage)</h2>
          <p className="muted">SPES officer drafts a new record. Saved to localStorage in this POC.</p>
          <div className="form-field">
            <label htmlFor="cr-title">Title</label>
            <input id="cr-title" type="text" value={draftForm.title} onChange={(e) => setDraftForm({ ...draftForm, title: e.target.value })} />
          </div>
          <div className="form-field">
            <label htmlFor="cr-type">Participation type</label>
            <select id="cr-type" value={draftForm.participationType} onChange={(e) => setDraftForm({ ...draftForm, participationType: e.target.value })}>
              {["Public consultation", "Survey", "Development notice", "Design feedback", "Planning disclosure", "Environmental and social feedback", "Road and mobility feedback", "Public space feedback"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="cr-location">Location name</label>
            <input id="cr-location" type="text" value={draftForm.locationName} onChange={(e) => setDraftForm({ ...draftForm, locationName: e.target.value })} />
          </div>
          <div className="form-field">
            <label htmlFor="cr-summary">Project summary</label>
            <textarea id="cr-summary" value={draftForm.summary} onChange={(e) => setDraftForm({ ...draftForm, summary: e.target.value })} />
          </div>
          <button type="button" className="btn btn-primary" onClick={saveDraft} disabled={!draftForm.title.trim()}>
            Save draft
          </button>
          {savedMsg && <p className="ok-text" role="status">{savedMsg}</p>}
          {drafts.length > 0 && (
            <>
              <h3>Drafts in this browser</h3>
              <ul className="alias-list">
                {drafts.map((d) => (
                  <li key={d.draftId}>
                    <span className="alias-tag">{d.draftId}</span> {d.title} <span className="muted">({d.participationType}, {d.createdAt})</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {tab === "GIS linking" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Link record to GIS location</h2>
          <p className="muted">
            GIS data steward links each record to a canonical place ID. All known aliases from Estate, Planning, GIS,
            and project records are stored against that place.
          </p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Record</th>
                  <th scope="col">Linked canonical place</th>
                  <th scope="col">Alias count</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const place = places.find((p) => p.canonicalPlaceId === r.canonicalPlaceId);
                  return (
                    <tr key={r.recordId}>
                      <td>{r.title}</td>
                      <td>
                        <span className="alias-tag">{r.canonicalPlaceId}</span> {place?.displayName}
                      </td>
                      <td>{place?.aliases.length ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted">Use the ID harmonization tab to re-link records or resolve ambiguous aliases.</p>
        </div>
      )}

      {tab === "Survey builder" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Survey builder (preview)</h2>
          <p className="muted">Read-only preview of survey structures. Full builder arrives with the backend phase.</p>
          {records.filter((r) => r.surveyQuestions.length > 0).map((r) => (
            <details key={r.recordId} style={{ marginBottom: "0.6rem" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--hdc-blue)" }}>{r.title}</summary>
              <ol style={{ fontSize: "0.86rem" }}>
                {r.surveyQuestions.map((q) => (
                  <li key={q.id}>
                    {q.label} <span className="muted">({q.type}{q.required ? ", required" : ""}{q.options ? `, ${q.options.length} options` : ""})</span>
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </div>
      )}

      {tab === "Moderation queue" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Moderation queue</h2>
          <ModerationQueue />
        </div>
      )}

      {tab === "Results review" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Results review (SPES)</h2>
          <p className="muted">SPES reviews cleaned results before preparing the conclusion and response matrix.</p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Record</th>
                  <th scope="col">Status</th>
                  <th scope="col">Flagged in moderation</th>
                  <th scope="col">Results</th>
                </tr>
              </thead>
              <tbody>
                {records.filter((r) => r.status === "Completed" || r.status === "Ongoing").map((r) => (
                  <tr key={r.recordId}>
                    <td>{r.title}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>{moderationItems.filter((m) => m.recordId === r.recordId).length}</td>
                    <td>
                      {r.status === "Completed" ? (
                        <Link className="btn btn-sm btn-blue" to={`/results/${r.recordId}`}>Open results</Link>
                      ) : (
                        <span className="muted">Collection still open</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "Conclusion publishing" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Conclusion publishing</h2>
          <p className="muted">Senior approver / SPES publish the final decision to the public portal.</p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Record</th>
                  <th scope="col">Decision status</th>
                  <th scope="col">Published on</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.recordId}>
                    <td>{r.title}</td>
                    <td>
                      {r.decision ? (
                        <span className="ok-text">Published — {r.decision.decisionStatus}</span>
                      ) : r.status === "Ongoing" ? (
                        <span className="warn-text">Awaiting close + SPES review</span>
                      ) : (
                        <span className="muted">Not started</span>
                      )}
                    </td>
                    <td>{r.decision?.decidedOn ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "ID harmonization" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>ID harmonization</h2>
          <HarmonizationTable />
        </div>
      )}

      {tab === "Role access matrix" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Role access matrix</h2>
          <RoleMatrix />
        </div>
      )}

      {tab === "Workflow pipeline" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Participation workflow pipeline</h2>
          <WorkflowPipeline />
          <h3>Where each record sits</h3>
          <ul className="alias-list">
            {records.map((r) => (
              <li key={r.recordId}>
                <span className="alias-tag">{r.recordId}</span> {r.title} → <strong>{r.workflowStage}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
