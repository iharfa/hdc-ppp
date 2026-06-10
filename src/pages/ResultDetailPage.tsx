import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getRecord,
  getResponsesForRecord,
  getCommentsForRecord,
  getModerationForRecord,
  countBy,
} from "../services/dataService";
import { Chart, barOption, pieOption } from "../components/Chart";
import { StatusBadge } from "../components/StatusBadge";
import { DownloadPlaceholder } from "../components/DownloadPlaceholder";

export function ResultDetailPage() {
  const { recordId } = useParams();
  const record = recordId ? getRecord(recordId) : undefined;
  const responses = useMemo(() => (recordId ? getResponsesForRecord(recordId) : []), [recordId]);

  if (!record) {
    return (
      <div className="page">
        <div className="empty-state">
          Record not found. <Link to="/results">Back to results</Link>
        </div>
      </div>
    );
  }
  if (record.status !== "Completed" || !record.decision) {
    return (
      <div className="page">
        <h1>{record.title}</h1>
        <div className="empty-state">
          Results for this record are not yet published. Results appear after moderation, SPES review, and decision
          publication.
          <br />
          <Link to={`/records/${record.recordId}`}>Back to record</Link>
        </div>
      </div>
    );
  }

  const comments = getCommentsForRecord(record.recordId);
  const moderation = getModerationForRecord(record.recordId);
  const verified = responses.filter((r) => r.verification === "efaas-verified").length;

  const yesNo = countBy(responses.filter((r) => r.answers["q-support"]), (r) => r.answers["q-support"]);
  const mcQuestion = record.surveyQuestions.find((q) => q.type === "multiplechoice");
  const mc = mcQuestion ? countBy(responses.filter((r) => r.answers[mcQuestion.id]), (r) => r.answers[mcQuestion.id]) : [];
  const byAge = countBy(responses, (r) => r.demographics.ageGroup);
  const byGender = countBy(responses, (r) => r.demographics.gender);
  const byWard = countBy(responses, (r) => r.demographics.ward);
  const byResident = countBy(responses, (r) => r.demographics.residentType);

  return (
    <div className="page">
      <StatusBadge status={record.status} /> <span className="muted">Sample POC data — not a real HDC decision</span>
      <h1>Results: {record.title}</h1>

      <div className="card" style={{ borderLeft: "4px solid var(--hdc-blue)" }}>
        <h2 style={{ marginTop: 0 }}>Official decision / conclusion</h2>
        <p>{record.decision.conclusion}</p>
        <p className="muted">Decision published: {record.decision.decidedOn} · Responsible: {record.responsibleSection}</p>
      </div>

      <div className="grid-4" style={{ marginTop: "1rem" }}>
        <div className="card stat-card" style={{ marginTop: 0 }}>
          <div className="stat-value">{responses.length}</div>
          <div className="stat-label">Total responses (cleaned)</div>
        </div>
        <div className="card stat-card" style={{ marginTop: 0 }}>
          <div className="stat-value">{verified}</div>
          <div className="stat-label">Verified responses</div>
        </div>
        <div className="card stat-card" style={{ marginTop: 0 }}>
          <div className="stat-value">{responses.length - verified}</div>
          <div className="stat-label">Anonymous responses</div>
        </div>
        <div className="card stat-card" style={{ marginTop: 0 }}>
          <div className="stat-value">{moderation.length}</div>
          <div className="stat-label">Items flagged in moderation</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: "1rem" }}>
        <div className="card" style={{ marginTop: 0 }}>
          <Chart option={pieOption("Yes / no result (sample)", yesNo)} ariaLabel="Pie chart of yes and no responses" />
        </div>
        {mc.length > 0 && (
          <div className="card" style={{ marginTop: 0 }}>
            <Chart option={barOption(`${mcQuestion?.label ?? "Multiple choice"} (sample)`, mc, true)} ariaLabel="Bar chart of multiple choice answers" height={320} />
          </div>
        )}
        <div className="card" style={{ marginTop: 0 }}>
          <Chart option={pieOption("Participation by age group (sample)", byAge)} ariaLabel="Pie chart of participation by age group" />
        </div>
        <div className="card" style={{ marginTop: 0 }}>
          <Chart option={pieOption("Participation by gender (sample)", byGender)} ariaLabel="Pie chart of participation by gender" />
        </div>
        <div className="card" style={{ marginTop: 0 }}>
          <Chart option={barOption("Participation by ward (sample)", byWard)} ariaLabel="Bar chart of participation by ward" />
        </div>
        <div className="card" style={{ marginTop: 0 }}>
          <Chart option={pieOption("Participation by resident type (sample)", byResident)} ariaLabel="Pie chart of participation by resident type" />
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: "1rem" }}>
        <div className="card" style={{ marginTop: 0 }}>
          <h2 style={{ marginTop: 0 }}>Common themes from open-ended responses</h2>
          <ul>
            {record.decision.commonThemes.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <h2>Moderation summary</h2>
          <p>{record.decision.moderationSummary}</p>
          <h2>Data quality summary</h2>
          <p>{record.decision.dataQualitySummary}</p>
        </div>
        <div className="card" style={{ marginTop: 0 }}>
          <h2 style={{ marginTop: 0 }}>Cleaned public comment samples</h2>
          {comments.length === 0 ? (
            <div className="empty-state">No published comments.</div>
          ) : (
            <ul style={{ paddingLeft: "1.1rem", fontSize: "0.88rem" }}>
              {comments.map((c) => (
                <li key={c.commentId} style={{ marginBottom: "0.4rem" }}>
                  "{c.text}" <span className="muted">— {c.ward}, {c.submittedAt} (cleaned sample)</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <h2>Public datasets</h2>
      <div className="card">
        <p className="muted">Cleaned result datasets approved for public disclosure. Placeholders in this POC.</p>
        <DownloadPlaceholder />
      </div>

      <p style={{ marginTop: "1.5rem" }}>
        <Link className="btn" to={`/records/${record.recordId}`}>
          Back to participation record
        </Link>
      </p>
    </div>
  );
}
