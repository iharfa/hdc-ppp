import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { DemographicProfile, ParticipationRecord, SurveyQuestion, SurveyResponse } from "../types";
import { saveSubmission } from "../services/storage";
import { MapPinPicker } from "./MapPinPicker";

type Step = "questions" | "review" | "confirm";

interface Props {
  record: ParticipationRecord;
}

/** Reusable survey engine: questions, review, confirmation. Responses are anonymous. */
export function SurveyForm({ record }: Props) {
  const questions = record.surveyQuestions;
  const [step, setStep] = useState<Step>("questions");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const steps: { key: Step; label: string }[] = [
    { key: "questions", label: "1. Questions" },
    { key: "review", label: "2. Review" },
    { key: "confirm", label: "3. Confirmation" },
  ];
  const stepIndex = steps.findIndex((s) => s.key === step);

  const demographicIds = useMemo(
    () => new Set(questions.filter((q) => q.type === "demographic").map((q) => q.id)),
    [questions],
  );

  function setAnswer(id: string, value: string) {
    setAnswers((a) => ({ ...a, [id]: value }));
    setErrors((e) => {
      const { [id]: _removed, ...rest } = e;
      return rest;
    });
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    for (const q of questions) {
      if (!q.required) continue;
      const v = answers[q.id];
      if (q.type === "consent" && v !== "yes") errs[q.id] = "Consent is required to submit.";
      else if (q.type !== "consent" && (!v || !v.trim())) errs[q.id] = "This question is required.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function submit() {
    const demographics: DemographicProfile = {
      ageGroup: answers["q-age"] ?? "Not stated",
      gender: answers["q-gender"] ?? "Not stated",
      ward: answers["q-ward"] ?? "Not stated",
      residentType: answers["q-resident"] ?? "Not stated",
    };
    const nonDemographic = Object.fromEntries(Object.entries(answers).filter(([k]) => !demographicIds.has(k)));
    const response: SurveyResponse = {
      responseId: `LOCAL-${record.recordId}-${Date.now()}`,
      recordId: record.recordId,
      submittedAt: new Date().toISOString().slice(0, 10),
      demographics,
      answers: nonDemographic,
      sample: true,
    };
    saveSubmission(response);
    setSubmittedId(response.responseId);
    setStep("confirm");
  }

  function renderQuestion(q: SurveyQuestion) {
    const error = errors[q.id];
    const labelText = (
      <>
        {q.label} {q.required && <span className="required-mark" aria-hidden="true">*</span>}
      </>
    );
    return (
      <div className="form-field" key={q.id}>
        {q.type === "mappin" ? (
          <>
            <span className="field-label">{labelText}</span>
            <p className="help-text">Click the map to drop a pin on the spot your answer refers to.</p>
            <MapPinPicker id={q.id} value={answers[q.id] ?? ""} onChange={(v) => setAnswer(q.id, v)} invalid={!!error} />
          </>
        ) : q.type === "opentext" ? (
          <>
            <label htmlFor={q.id}>{labelText}</label>
            <textarea id={q.id} value={answers[q.id] ?? ""} onChange={(e) => setAnswer(q.id, e.target.value)} aria-invalid={!!error} />
          </>
        ) : q.type === "consent" ? (
          <label className="consent-row">
            <input
              type="checkbox"
              checked={answers[q.id] === "yes"}
              onChange={(e) => setAnswer(q.id, e.target.checked ? "yes" : "")}
              aria-invalid={!!error}
            />
            <span>
              {q.label} <span className="required-mark" aria-hidden="true">*</span>
            </span>
          </label>
        ) : (
          <fieldset className="field-set">
            <legend className="field-label">{labelText}</legend>
            <div className="radio-list">
              {(q.type === "yesno" ? ["Yes", "No"] : q.options ?? []).map((opt) => (
                <label key={opt}>
                  <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt} onChange={() => setAnswer(q.id, opt)} />
                  {opt}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {error && <p className="field-error" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div className="survey-step">
      <ol className="progress-steps" aria-label="Survey progress">
        {steps.map((s, i) => (
          <li key={s.key} className={`step ${i === stepIndex ? "current" : i < stepIndex ? "done" : ""}`} aria-current={i === stepIndex ? "step" : undefined}>
            {s.label}
          </li>
        ))}
      </ol>

      {step === "questions" && (
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            if (validate()) setStep("review");
          }}
        >
          <p className="muted survey-intro">
            Responses are anonymous. No identity is collected; demographic answers are used only for aggregate results.
          </p>
          {questions.map(renderQuestion)}
          <div className="panel-actions">
            <Link className="btn" to={`/records/${record.recordId}`}>
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary">
              Review answers
            </button>
          </div>
        </form>
      )}

      {step === "review" && (
        <div className="card">
          <h2 className="card-title">Review your response</h2>
          <dl className="review-list">
            {questions
              .filter((q) => q.type !== "consent")
              .map((q) => (
                <div key={q.id}>
                  <dt>{q.label}</dt>
                  <dd>{answers[q.id]?.trim() || <span className="muted">No answer</span>}</dd>
                </div>
              ))}
          </dl>
          <div className="panel-actions">
            <button type="button" className="btn" onClick={() => setStep("questions")}>
              Edit answers
            </button>
            <button type="button" className="btn btn-primary" onClick={submit}>
              Submit response
            </button>
          </div>
        </div>
      )}

      {step === "confirm" && (
        <div className="card" role="status">
          <h2 className="card-title ok-text">Response submitted</h2>
          <p>
            Thank you for participating. Your mock response has been saved locally in this browser
            (reference <span className="alias-tag">{submittedId}</span>).
          </p>
          <p className="muted">
            Proof of Concept: responses are stored in localStorage only. In the production system they will be stored
            securely, moderated, and included in the published results.
          </p>
          <div className="panel-actions">
            <Link className="btn" to={`/records/${record.recordId}`}>
              Back to record
            </Link>
            <Link className="btn btn-blue" to="/map">
              Back to map
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
