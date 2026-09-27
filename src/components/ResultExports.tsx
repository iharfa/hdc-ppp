import type { ParticipationRecord, PublicComment, SurveyResponse } from "../types";
import { countBy } from "../services/dataService";
import { downloadBlob, makePdfBlob, safeFilename } from "../utils/placeholderDoc";

interface Props {
  record: ParticipationRecord;
  responses: SurveyResponse[];
  comments: PublicComment[];
  moderationCount: number;
}

function csv(rows: (string | number)[][]): Blob {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM so Excel opens UTF-8 (Dhivehi, accented names) correctly.
  return new Blob(["﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
}

/** Real client-side exports of the cleaned dataset, the response matrix and a summary PDF. */
export function ResultExports({ record, responses, comments, moderationCount }: Props) {
  const questions = record.surveyQuestions.filter((q) => q.type !== "consent" && q.type !== "demographic");
  const base = safeFilename(record.recordId);

  function exportCleaned() {
    const header = ["responseId", "submittedAt", "ageGroup", "gender", "ward", "residentType", ...questions.map((q) => q.id)];
    const rows = responses.map((r) => [
      r.responseId,
      r.submittedAt,
      r.demographics.ageGroup,
      r.demographics.gender,
      r.demographics.ward,
      r.demographics.residentType,
      ...questions.map((q) => r.answers[q.id] ?? ""),
    ]);
    downloadBlob(csv([header, ...rows]), `${base}_cleaned_responses.csv`);
  }

  function exportMatrix() {
    const rows: (string | number)[][] = [["question", "option", "count", "share"]];
    for (const q of questions.filter((x) => x.type === "yesno" || x.type === "multiplechoice")) {
      const answered = responses.filter((r) => r.answers[q.id]);
      for (const { name, value } of countBy(answered, (r) => r.answers[q.id])) {
        rows.push([q.label, name, value, answered.length ? `${Math.round((value / answered.length) * 100)}%` : "0%"]);
      }
    }
    const open = questions.filter((x) => x.type === "opentext" || x.type === "mappin");
    for (const q of open) rows.push([q.label, "(answered)", responses.filter((r) => r.answers[q.id]).length, ""]);
    downloadBlob(csv(rows), `${base}_response_matrix.csv`);
  }

  function exportSummary() {
    const lines: string[] = [
      `Record: ${record.recordId}`,
      `Period: ${record.periodStart} to ${record.periodEnd}`,
      `Responsible: ${record.responsibleSection}`,
      "",
      `Responses (cleaned): ${responses.length}   Published comments: ${comments.length}   Flagged in moderation: ${moderationCount}`,
      "",
    ];
    for (const q of questions.filter((x) => x.type === "yesno" || x.type === "multiplechoice")) {
      const answered = responses.filter((r) => r.answers[q.id]);
      lines.push(q.label);
      for (const { name, value } of countBy(answered, (r) => r.answers[q.id])) {
        lines.push(`   ${name}: ${value} (${answered.length ? Math.round((value / answered.length) * 100) : 0}%)`);
      }
      lines.push("");
    }
    if (record.decision) {
      lines.push(`Decision: ${record.decision.decisionStatus} (${record.decision.decidedOn})`, record.decision.conclusion, "");
      lines.push("Common themes:", ...record.decision.commonThemes.map((t) => `   - ${t}`), "");
    }
    lines.push("Proof of concept. Sample participation data only.");
    downloadBlob(makePdfBlob(`Results summary: ${record.title}`, lines), `${base}_summary.pdf`);
  }

  return (
    <div className="panel-actions">
      <button type="button" className="btn" onClick={exportSummary}>
        Summary PDF
      </button>
      <button type="button" className="btn" onClick={exportCleaned}>
        Cleaned dataset CSV
      </button>
      <button type="button" className="btn" onClick={exportMatrix}>
        Response matrix CSV
      </button>
    </div>
  );
}
