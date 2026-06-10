import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { DemographicProfile, ParticipationRecord, SurveyQuestion, SurveyResponse } from "../types";
import { saveSubmission } from "../services/storage";
import { EfaasModal } from "./EfaasModal";

type Step = "mode" | "questions" | "review" | "confirm";

interface Props {
  record: ParticipationRecord;
}

/** Reusable survey engine: mode selection, questions, review, confirmation. */
export function SurveyForm({ record }: Props) {
  const questions = record.surveyQuestions;
  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState<"anonymous" | "efaas" | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showEfaas, setShowEfaas] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const steps: { key: Step; label: string }[] = [
    { key: "mode", label: "1. Verification mode" },
    { key: "questions", label: "2. Questions" },
    { key: "review", label: "3. Review" },
    { key: "confirm", label: "4. Confirmation" },
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

  function buildResponse(verification: "anonymous" | "efaas-verified"): SurveyResponse {
    const demographics: DemographicProfile = {
      ageGroup: answers["q-age"] ?? "Not stated",
      gender: answers["q-gender"] ?? "Not stated",
      ward: answers["q-ward"] ?? "Not stated",
      residentType: answers["q-resident"] ?? "Not stated",
    };
    const nonDemographic = Object.fromEntries(Object.entries(answers).filter(([k]) => !demographicIds.has(k)));
    return {
      responseId: `LOCAL-${record.recordId}-${Date.now()}`,
      recordId: record.recordId,
      submittedAt: new Date().toISOString().slice(0, 10),
      verification,
      demographics,
      answers: nonDemographic,
      sample: true,
    };
  }

  function submit(verification: "anonymous" | "efaas-verified") {
    const response = buildResponse(verification);
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
        {q.type === "opentext" || q.type === "mappin" ? (
          <>
            <label htmlFor={q.id}>{labelText}</label>
            {q.type === "mappin" && (
              <p className="help-text">
                POC placeholder: enter a short location description instead of a live map pin (e.g. "near the east
                entrance"). A real map-pin picker arrives with the backend phase.
              </p>
            )}
            <textarea id={q.id} value={answers[q.id] ?? ""} onChange={(e) => setAnswer(q.id, e.target.value)} aria-invalid={!!error} />
          </>
        ) : q.type === "consent" ? (
          <label style={{ display: "flex", gap: "0.5rem", fontWeight: 400 }}>
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
        ) : q.type === "yesno" ? (
          <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
            <legend className="field-label" style={{ fontWeight: 600, padding: 0 }}>{labelText}</legend>
            <div className="radio-list">
              {["Yes", "No"].map((opt) => (
                <label key={opt}>
                  <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt} onChange={() => setAnswer(q.id, opt)} />
                  {opt}
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
            <legend className="field-label" style={{ fontWeight: 600, padding: 0 }}>{labelText}</legend>
            <div className="radio-list">
              {(q.options ?? []).map((opt) => (
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
      <div className="progress-steps" aria-label="Survey progress">
        {steps.map((s, i) => (
          <div key={s.key} className={`step ${i === stepIndex ? "current" : i < stepIndex ? "done" : ""}`}>
            {s.label}
          </div>
        ))}
      </div>

      {step === "mode" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>How would you like to respond?</h2>
          <div className="radio-list" role="radiogroup" aria-label="Verification mode">
            {record.anonymousAllowed && (
              <label>
                <input type="radio" name="mode" checked={mode === "anonymous"} onChange={() => setMode("anonymous")} />
                <span>
                  <strong>Anonymous</strong> — no identity collected. Your response counts toward anonymous totals.
                </span>
              </label>
            )}
            <label>
              <input type="radio" name="mode" checked={mode === "efaas"} onChange={() => setMode("efaas")} />
              <span>
                <strong>eFaas verified</strong> — verify your identity through eFaas before submitting.{" "}
                <span className="muted">POC only. Real eFaas integration pending.</span>
              </span>
            </label>
          </div>
          {record.efaasRequired && <p className="muted">This process requires eFaas verification.</p>}
          <div className="panel-actions">
            <button type="button" className="btn btn-primary" disabled={!mode} onClick={() => setStep("questions")}>
              Continue
            </button>
          </div>
        </div>
      )}

      {step === "questions" && (
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            if (validate()) setStep("review");
          }}
        >
          {questions.map(renderQuestion)}
          <div className="panel-actions">
            <button type="button" className="btn" onClick={() => setStep("mode")}>
              Back
            </button>
            <button type="submit" className="btn btn-primary">
              Review answers
            </button>
          </div>
        </form>
      )}

      {step === "review" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Review your response</h2>
          <p className="muted">
            Submitting as: <strong>{mode === "efaas" ? "eFaas verified (mock)" : "Anonymous"}</strong>
          </p>
          <dl style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.5rem" }}>
            {questions
              .filter((q) => q.type !== "consent")
              .map((q) => (
                <div key={q.id}>
                  <dt style={{ fontWeight: 600, fontSize: "0.85rem" }}>{q.label}</dt>
                  <dd style={{ margin: 0 }}>{answers[q.id]?.trim() || <span className="muted">No answer</span>}</dd>
                </div>
              ))}
          </dl>
          <div className="panel-actions">
            <button type="button" className="btn" onClick={() => setStep("questions")}>
              Edit answers
            </button>
            {mode === "efaas" ? (
              <button type="button" className="btn btn-primary" onClick={() => setShowEfaas(true)}>
                Continue with eFaas
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => submit("anonymous")}>
                Submit response
              </button>
            )}
          </div>
        </div>
      )}

      {step === "confirm" && (
        <div className="card" role="status">
          <h2 style={{ marginTop: 0 }} className="ok-text">
            ✓ Response submitted
          </h2>
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
            <Link className="btn btn-blue" to="/">
              Back to map
            </Link>
          </div>
        </div>
      )}

      {showEfaas && (
        <EfaasModal
          onCancel={() => setShowEfaas(false)}
          onVerified={() => {
            setShowEfaas(false);
            submit("efaas-verified");
          }}
        />
      )}
    </div>
  );
}
