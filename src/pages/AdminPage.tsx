import { useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { getRecords, roles, places, workflowSteps, getEffectiveModeration, effectivePlaceId, nextRecordId } from "../services/dataService";
import { saveCreatedRecord, saveRecordOverride } from "../services/storage";
import type { DecisionStatus, ParticipationRecord, ParticipationStatus, ParticipationType, SurveyQuestion, SurveyQuestionType } from "../types";
import { Logo } from "../components/Logo";
import { StatusBadge } from "../components/StatusBadge";
import { WorkflowPipeline } from "../components/WorkflowPipeline";
import { RoleMatrix } from "../components/RoleMatrix";
import { ModerationQueue } from "../components/ModerationQueue";
import { HarmonizationTable } from "../components/HarmonizationTable";
import { SurveyBuilder } from "../components/SurveyBuilder";
import { ProposalReview } from "../components/ProposalReview";

const TABS = [
  "Participation registry",
  "Community ideas",
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
  "spes-officer": ["Participation registry", "Community ideas", "Create record", "Survey builder", "Results review", "Conclusion publishing", "Workflow pipeline"],
  "participation-manager": ["Participation registry", "Community ideas", "Create record", "Survey builder", "Results review", "Workflow pipeline"],
  "gis-steward": ["Participation registry", "GIS linking", "ID harmonization"],
  moderator: ["Participation registry", "Moderation queue"],
  "dept-reviewer": ["Participation registry", "Workflow pipeline"],
  "senior-approver": ["Participation registry", "Community ideas", "Conclusion publishing", "Workflow pipeline"],
  "system-admin": [...TABS],
};

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
const DECISIONS: DecisionStatus[] = ["Approved", "Approved with amendments", "Partially approved", "Rejected", "Deferred"];

// Public status implied by each workflow stage.
const STAGE_STATUS: Record<string, ParticipationStatus> = {
  draft: "Internal Review",
  "gis-linking": "Internal Review",
  "internal-review": "Internal Review",
  approved: "Planned",
  active: "Ongoing",
  closed: "Closed",
  moderation: "Closed",
  "spes-review": "Closed",
  "decision-published": "Completed",
  archived: "Completed",
};

const today = () => new Date().toISOString().slice(0, 10);

/** Default survey a new record starts with; edit in the Survey builder. */
function defaultQuestions(): SurveyQuestion[] {
  const q = (id: string, type: SurveyQuestionType, label: string, required: boolean, options?: string[]): SurveyQuestion => ({ id, type, label, required, options });
  return [
    q("q-age", "demographic", "Your age group", true, ["Under 18", "18-29", "30-44", "45-59", "60+"]),
    q("q-gender", "demographic", "Gender", false, ["Female", "Male", "Prefer not to say"]),
    q("q-ward", "demographic", "Which ward or area do you live in?", true, ["Ward 1", "Ward 2", "Ward 3", "Ward 4", "Not a Hulhumalé resident"]),
    q("q-resident", "demographic", "Your relationship to the area", true, ["Resident owner", "Resident tenant", "Worker in area", "Visitor"]),
    q("q-support", "yesno", "Do you support this proposal?", true),
    q("q-comment", "opentext", "Any comments or concerns?", false),
    q("q-pin", "mappin", "Mark a location your comment refers to", false),
    q("q-consent", "consent", "I understand this is a sample POC survey and my response is stored locally.", true),
  ];
}

export function AdminPage() {
  const [tab, setTab] = useState<Tab>("Participation registry");
  const [roleId, setRoleId] = useState("spes-officer");
  const [records, setRecords] = useState<ParticipationRecord[]>(getRecords);
  const refresh = () => setRecords(getRecords());
  const [msg, setMsg] = useState("");
  const allowedTabs = ROLE_TABS[roleId] ?? [];
  const role = roles.find((r) => r.roleId === roleId);
  const moderationItems = getEffectiveModeration();

  function changeRole(id: string) {
    setRoleId(id);
    const allowed = ROLE_TABS[id] ?? [];
    if (!allowed.includes(tab)) setTab(allowed[0] ?? "Participation registry");
  }

  // ---- Workflow transitions ----
  function nextStage(stageId: string) {
    const i = workflowSteps.findIndex((s) => s.stepId === stageId);
    return i >= 0 ? workflowSteps[i + 1] : undefined;
  }
  function advance(r: ParticipationRecord) {
    const next = nextStage(r.workflowStage);
    if (!next) return;
    if (next.stepId === "decision-published" && !r.decision) {
      setMsg(`${r.recordId}: publish a decision on the Conclusion publishing tab before moving to "${next.name}".`);
      return;
    }
    const status = STAGE_STATUS[next.stepId] ?? r.status;
    saveRecordOverride({
      recordId: r.recordId,
      workflowStage: next.stepId,
      status,
      timeline: [...r.timeline, { date: today(), label: next.name, description: `Moved by ${role?.name ?? "staff"} (POC admin preview).` }],
    });
    refresh();
    setMsg(`${r.recordId} moved to "${next.name}" (public status: ${status}).`);
  }

  // ---- Create record ----
  const emptyForm = {
    title: "",
    participationType: "Public consultation" as ParticipationType,
    canonicalPlaceId: places[0]?.canonicalPlaceId ?? "",
    locationName: "",
    islandPhase: "Hulhumalé Phase 1",
    department: "Socio-Environmental Planning",
    summary: "",
    whyParticipation: "",
    periodStart: today(),
    periodEnd: "",
  };
  const [form, setForm] = useState(emptyForm);
  const set = (k: keyof typeof emptyForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });
  const canCreate = form.title.trim() && form.summary.trim() && form.periodEnd && form.periodEnd >= form.periodStart;

  function createRecord() {
    if (!canCreate) return;
    const place = places.find((p) => p.canonicalPlaceId === form.canonicalPlaceId);
    const record: ParticipationRecord = {
      recordId: nextRecordId(),
      title: form.title.trim(),
      status: "Internal Review",
      participationType: form.participationType,
      canonicalPlaceId: form.canonicalPlaceId,
      locationName: form.locationName.trim() || place?.displayName || "",
      knownReferences: place?.aliases.map((a) => a.value) ?? [],
      islandPhase: form.islandPhase,
      department: form.department,
      responsibleSection: "Socio-Environmental Planning Section",
      relatedDepartments: [],
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      summary: form.summary.trim(),
      whyParticipation: form.whyParticipation.trim(),
      documents: [],
      timeline: [{ date: today(), label: "Record drafted", description: `Drafted by ${role?.name ?? "staff"} (POC admin preview).` }],
      surveyQuestions: defaultQuestions(),
      workflowStage: "draft",
      sampleData: true,
    };
    saveCreatedRecord(record);
    setForm(emptyForm);
    refresh();
    setMsg(`${record.recordId} created in Draft. It now appears in the registry, on the map and in the records list.`);
    setTab("Participation registry");
  }

  // ---- Conclusion publishing ----
  const [decisionFor, setDecisionFor] = useState("");
  const [decision, setDecision] = useState({ decisionStatus: "Approved" as DecisionStatus, conclusion: "", commonThemes: "", moderationSummary: "", dataQualitySummary: "" });
  const decisionTarget = records.find((r) => r.recordId === decisionFor);
  function publishDecision() {
    if (!decisionTarget || !decision.conclusion.trim()) return;
    saveRecordOverride({
      recordId: decisionTarget.recordId,
      status: "Completed",
      workflowStage: "decision-published",
      decision: {
        decisionStatus: decision.decisionStatus,
        conclusion: `SAMPLE DECISION (POC): ${decision.conclusion.trim()}`,
        decidedOn: today(),
        commonThemes: decision.commonThemes.split("\n").map((t) => t.trim()).filter(Boolean),
        moderationSummary: decision.moderationSummary.trim() || "No moderation summary recorded.",
        dataQualitySummary: decision.dataQualitySummary.trim() || "No data quality summary recorded.",
      },
      timeline: [...decisionTarget.timeline, { date: today(), label: "Decision published", description: `Published by ${role?.name ?? "staff"} (POC admin preview).` }],
    });
    setDecision({ decisionStatus: "Approved", conclusion: "", commonThemes: "", moderationSummary: "", dataQualitySummary: "" });
    setDecisionFor("");
    refresh();
    setMsg(`${decisionTarget.recordId}: decision published. Results page is now live.`);
  }

  return (
    <div className="page">
      <div className="admin-title">
        <Logo dark />
        <h1>Admin Preview</h1>
      </div>
      <p className="muted">
        Frontend-only preview of HDC staff workflows. No authentication in this POC; role-based access control will be
        enforced server-side in the backend phase. Edits are saved in this browser only.
      </p>

      <div className="role-select">
        <label htmlFor="role-select">
          <strong>Preview as role:</strong>
        </label>
        <select id="role-select" value={roleId} onChange={(e) => changeRole(e.target.value)}>
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

      {msg && (
        <p className="ok-text" role="status">
          {msg}
        </p>
      )}

      {tab === "Participation registry" && (
        <div className="card">
          <h2>Participation registry</h2>
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
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const next = nextStage(r.workflowStage);
                  return (
                    <tr key={r.recordId}>
                      <td>
                        <Link to={`/records/${r.recordId}`}>{r.title}</Link>
                        <br />
                        <span className="alias-tag">{r.recordId}</span>
                      </td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>{r.participationType}</td>
                      <td>{workflowSteps.find((s) => s.stepId === r.workflowStage)?.name ?? r.workflowStage}</td>
                      <td>{r.periodStart} to {r.periodEnd}</td>
                      <td><span className="alias-tag">{effectivePlaceId(r)}</span></td>
                      <td>
                        {next ? (
                          <button type="button" className="btn btn-sm" onClick={() => advance(r)} disabled={roleId === "public-viewer" || roleId === "public-respondent"}>
                            Move to {next.name}
                          </button>
                        ) : (
                          <span className="muted">Archived</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "Community ideas" && (
        <div className="card">
          <h2>Community ideas</h2>
          <ProposalReview
            actor={role?.name ?? "staff"}
            defaultQuestions={defaultQuestions}
            onRecordCreated={() => {
              refresh();
              setMsg("Idea taken up: a draft participation record was created. Set its dates and survey in the registry.");
            }}
          />
        </div>
      )}

      {tab === "Create record" && (
        <div className="card survey-step">
          <h2>Create participation record</h2>
          <p className="muted">Starts in the Draft stage with a default survey. Edit questions in the Survey builder, then move it through the workflow from the registry.</p>
          <div className="form-field">
            <label htmlFor="cr-title">Title</label>
            <input id="cr-title" type="text" value={form.title} onChange={set("title")} />
          </div>
          <div className="filter-row">
            <label className="form-field">
              Participation type
              <select value={form.participationType} onChange={set("participationType")}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="form-field">
              Canonical place
              <select value={form.canonicalPlaceId} onChange={set("canonicalPlaceId")}>
                {places.map((p) => <option key={p.canonicalPlaceId} value={p.canonicalPlaceId}>{p.canonicalPlaceId}: {p.displayName}</option>)}
              </select>
            </label>
          </div>
          <div className="form-field">
            <label htmlFor="cr-location">Location name (public label)</label>
            <input id="cr-location" type="text" value={form.locationName} onChange={set("locationName")} placeholder={places.find((p) => p.canonicalPlaceId === form.canonicalPlaceId)?.displayName} />
          </div>
          <div className="filter-row">
            <label className="form-field">
              Island or phase
              <input type="text" value={form.islandPhase} onChange={set("islandPhase")} />
            </label>
            <label className="form-field">
              Lead department
              <input type="text" value={form.department} onChange={set("department")} />
            </label>
          </div>
          <div className="filter-row">
            <label className="form-field">
              Participation opens
              <input type="date" value={form.periodStart} onChange={set("periodStart")} />
            </label>
            <label className="form-field">
              Participation closes
              <input type="date" value={form.periodEnd} min={form.periodStart} onChange={set("periodEnd")} />
            </label>
          </div>
          <div className="form-field">
            <label htmlFor="cr-summary">Project summary</label>
            <textarea id="cr-summary" value={form.summary} onChange={set("summary")} />
          </div>
          <div className="form-field">
            <label htmlFor="cr-why">Why public participation is needed</label>
            <textarea id="cr-why" value={form.whyParticipation} onChange={set("whyParticipation")} />
          </div>
          <button type="button" className="btn btn-primary" onClick={createRecord} disabled={!canCreate}>
            Create record
          </button>
        </div>
      )}

      {tab === "GIS linking" && (
        <div className="card">
          <h2>Link record to GIS location</h2>
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
                  const placeId = effectivePlaceId(r);
                  const place = places.find((p) => p.canonicalPlaceId === placeId);
                  return (
                    <tr key={r.recordId}>
                      <td>{r.title}</td>
                      <td>
                        <span className="alias-tag">{placeId}</span> {place?.displayName}
                        {placeId !== r.canonicalPlaceId && <span className="muted"> (manually re-linked)</span>}
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
          <h2>Survey builder</h2>
          <p className="muted">Edit the questions for any record that is not yet published. Changes apply to the public survey immediately (saved in this browser).</p>
          <SurveyBuilder records={records} onSaved={refresh} />
        </div>
      )}

      {tab === "Moderation queue" && (
        <div className="card">
          <h2>Moderation queue</h2>
          <ModerationQueue />
        </div>
      )}

      {tab === "Results review" && (
        <div className="card">
          <h2>Results review (SPES)</h2>
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
                {records.filter((r) => r.status !== "Internal Review" && r.status !== "Planned").map((r) => (
                  <tr key={r.recordId}>
                    <td>{r.title}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>{moderationItems.filter((m) => m.recordId === r.recordId).length}</td>
                    <td>
                      {r.status === "Completed" ? (
                        <Link className="btn btn-sm btn-blue" to={`/results/${r.recordId}`}>Open results</Link>
                      ) : r.status === "Closed" ? (
                        <span className="muted">Awaiting decision</span>
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
          <h2>Conclusion publishing</h2>
          <p className="muted">Senior approver or SPES publishes the final decision. Publishing moves the record to Completed and opens its results page.</p>
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
                        <span className="ok-text">Published: {r.decision.decisionStatus}</span>
                      ) : r.status === "Closed" ? (
                        <span className="warn-text">Ready to publish</span>
                      ) : r.status === "Ongoing" ? (
                        <span className="muted">Collection still open</span>
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
          <h3>Publish a decision</h3>
          <div className="survey-step">
            <label className="form-field">
              Record
              <select value={decisionFor} onChange={(e) => setDecisionFor(e.target.value)}>
                <option value="">Select a record without a published decision</option>
                {records.filter((r) => !r.decision).map((r) => (
                  <option key={r.recordId} value={r.recordId}>{r.recordId}: {r.title} ({r.status})</option>
                ))}
              </select>
            </label>
            {decisionTarget && (
              <>
                {decisionTarget.status === "Ongoing" && <p className="warn-text">This record is still collecting responses. Publishing will close it.</p>}
                <label className="form-field">
                  Decision outcome
                  <select value={decision.decisionStatus} onChange={(e) => setDecision({ ...decision, decisionStatus: e.target.value as DecisionStatus })}>
                    {DECISIONS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </label>
                <div className="form-field">
                  <label htmlFor="dec-conclusion">Conclusion</label>
                  <textarea id="dec-conclusion" value={decision.conclusion} onChange={(e) => setDecision({ ...decision, conclusion: e.target.value })} />
                </div>
                <div className="form-field">
                  <label htmlFor="dec-themes">Common themes (one per line)</label>
                  <textarea id="dec-themes" value={decision.commonThemes} onChange={(e) => setDecision({ ...decision, commonThemes: e.target.value })} />
                </div>
                <div className="filter-row">
                  <label className="form-field">
                    Moderation summary
                    <textarea value={decision.moderationSummary} onChange={(e) => setDecision({ ...decision, moderationSummary: e.target.value })} />
                  </label>
                  <label className="form-field">
                    Data quality summary
                    <textarea value={decision.dataQualitySummary} onChange={(e) => setDecision({ ...decision, dataQualitySummary: e.target.value })} />
                  </label>
                </div>
                <button type="button" className="btn btn-primary" onClick={publishDecision} disabled={!decision.conclusion.trim()}>
                  Publish decision
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "ID harmonization" && (
        <div className="card">
          <h2>ID harmonization</h2>
          <HarmonizationTable />
        </div>
      )}

      {tab === "Role access matrix" && (
        <div className="card">
          <h2>Role access matrix</h2>
          <RoleMatrix />
        </div>
      )}

      {tab === "Workflow pipeline" && (
        <div className="card">
          <h2>Participation workflow pipeline</h2>
          <WorkflowPipeline />
          <h3>Where each record sits</h3>
          <ul className="alias-list">
            {records.map((r) => (
              <li key={r.recordId}>
                <span className="alias-tag">{r.recordId}</span> {r.title}: <strong>{workflowSteps.find((s) => s.stepId === r.workflowStage)?.name ?? r.workflowStage}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
