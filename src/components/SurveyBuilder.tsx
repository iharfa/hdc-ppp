import { useState } from "react";
import type { ParticipationRecord, SurveyQuestion, SurveyQuestionType } from "../types";
import { saveRecordOverride } from "../services/storage";

const TYPES: SurveyQuestionType[] = ["demographic", "yesno", "multiplechoice", "opentext", "mappin", "consent"];
const NEEDS_OPTIONS = new Set<SurveyQuestionType>(["demographic", "multiplechoice"]);

interface Props {
  records: ParticipationRecord[];
  onSaved(): void;
}

/** Edit a record's survey questions. Saved as a localStorage override in the POC. */
export function SurveyBuilder({ records, onSaved }: Props) {
  const editable = records.filter((r) => r.status !== "Completed");
  const [recordId, setRecordId] = useState(editable[0]?.recordId ?? "");
  const record = editable.find((r) => r.recordId === recordId);
  const [questions, setQuestions] = useState<SurveyQuestion[]>(record?.surveyQuestions ?? []);
  const [dirty, setDirty] = useState(false);

  function pick(id: string) {
    setRecordId(id);
    setQuestions(editable.find((r) => r.recordId === id)?.surveyQuestions ?? []);
    setDirty(false);
  }
  function update(i: number, patch: Partial<SurveyQuestion>) {
    setQuestions(questions.map((q, j) => (j === i ? { ...q, ...patch } : q)));
    setDirty(true);
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= questions.length) return;
    const next = questions.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setQuestions(next);
    setDirty(true);
  }
  function remove(i: number) {
    setQuestions(questions.filter((_, j) => j !== i));
    setDirty(true);
  }
  function add() {
    const n = questions.length + 1;
    setQuestions([...questions, { id: `q-new-${Date.now().toString(36)}`, type: "opentext", label: `Question ${n}`, required: false }]);
    setDirty(true);
  }
  function save() {
    if (!record) return;
    saveRecordOverride({ recordId: record.recordId, surveyQuestions: questions });
    setDirty(false);
    onSaved();
  }

  if (editable.length === 0) return <div className="empty-state">All records are completed; nothing to edit.</div>;

  return (
    <div className="survey-builder">
      <label className="form-field">
        Record
        <select value={recordId} onChange={(e) => pick(e.target.value)}>
          {editable.map((r) => (
            <option key={r.recordId} value={r.recordId}>{r.recordId}: {r.title} ({r.status})</option>
          ))}
        </select>
      </label>
      {record?.status === "Ongoing" && <p className="warn-text">This survey is live. Changing questions affects responses already collected.</p>}
      <ol className="builder-list">
        {questions.map((q, i) => (
          <li key={q.id} className="builder-item">
            <div className="builder-row">
              <input type="text" value={q.label} aria-label={`Question ${i + 1} label`} onChange={(e) => update(i, { label: e.target.value })} />
              <select value={q.type} aria-label={`Question ${i + 1} type`} onChange={(e) => update(i, { type: e.target.value as SurveyQuestionType, options: NEEDS_OPTIONS.has(e.target.value as SurveyQuestionType) ? q.options ?? ["Option 1", "Option 2"] : undefined })}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <label className="consent-row">
                <input type="checkbox" checked={q.required} onChange={(e) => update(i, { required: e.target.checked })} /> required
              </label>
            </div>
            {NEEDS_OPTIONS.has(q.type) && (
              <input
                type="text"
                aria-label={`Question ${i + 1} options`}
                value={(q.options ?? []).join(", ")}
                placeholder="Options, comma separated"
                onChange={(e) => update(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              />
            )}
            <div className="inline-actions">
              <span className="alias-tag">{q.id}</span>
              <button type="button" className="btn btn-sm" onClick={() => move(i, -1)} disabled={i === 0}>Up</button>
              <button type="button" className="btn btn-sm" onClick={() => move(i, 1)} disabled={i === questions.length - 1}>Down</button>
              <button type="button" className="btn btn-sm" onClick={() => remove(i)}>Remove</button>
            </div>
          </li>
        ))}
      </ol>
      <div className="panel-actions">
        <button type="button" className="btn" onClick={add}>Add question</button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={!dirty}>Save survey</button>
        {dirty && <span className="muted">Unsaved changes</span>}
      </div>
    </div>
  );
}
