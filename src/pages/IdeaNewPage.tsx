import { useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PROPOSAL_CATEGORIES, type CommunityProposal, type ProposalCategory, type ProposalImage } from "../types";
import { nextProposalId, places } from "../services/dataService";
import { saveLocalProposal } from "../services/storage";
import { fileToStoredImage, dataUrlBytes } from "../utils/images";
import { MapPinPicker } from "../components/MapPinPicker";

const PHASES = ["Hulhumalé Phase 1", "Hulhumalé Phase 1-2 Link", "Hulhumalé Phase 2", "Other HDC area"];
const MAX_IMAGES = 4;
const BUDGET_BYTES = 2_500_000; // stay well under the ~5 MB localStorage quota in the POC

type Step = "form" | "review" | "done";

export function IdeaNewPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("form");
  const [f, setF] = useState({
    title: "",
    category: "Public space" as ProposalCategory,
    islandPhase: PHASES[0],
    locationText: "",
    pin: "",
    canonicalPlaceId: "",
    whatChanges: "",
    benefit: "",
    impact: "",
    submitterName: "",
    contact: "",
    wantsToCoCreate: false,
    consent: false,
  });
  const [photos, setPhotos] = useState<ProposalImage[]>([]);
  const [sketches, setSketches] = useState<ProposalImage[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedId, setSavedId] = useState("");

  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const v = e.target instanceof HTMLInputElement && e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setF({ ...f, [k]: v });
    setErrors((er) => {
      const { [k]: _drop, ...rest } = er;
      return rest;
    });
  };

  const usedBytes = [...photos, ...sketches].reduce((n, i) => n + dataUrlBytes(i.dataUrl), 0);

  async function addImages(e: ChangeEvent<HTMLInputElement>, kind: "photos" | "sketches") {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    const current = kind === "photos" ? photos : sketches;
    const next = [...current];
    for (const file of files.slice(0, MAX_IMAGES - current.length)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        next.push(await fileToStoredImage(file));
      } catch {
        setSaveError(`Could not read ${file.name}.`);
      }
    }
    (kind === "photos" ? setPhotos : setSketches)(next);
    setBusy(false);
  }
  function removeImage(kind: "photos" | "sketches", i: number) {
    (kind === "photos" ? setPhotos : setSketches)((kind === "photos" ? photos : sketches).filter((_, j) => j !== i));
  }

  function validate(): boolean {
    const er: Record<string, string> = {};
    if (!f.title.trim()) er.title = "Give your idea a short title.";
    if (!f.locationText.trim() && !f.pin.trim()) er.locationText = "Tell us where, in words or by dropping a pin.";
    if (f.whatChanges.trim().length < 40) er.whatChanges = "Describe what would change in a few sentences (at least 40 characters).";
    if (f.benefit.trim().length < 20) er.benefit = "Say how this would benefit people in the area.";
    if (!f.consent) er.consent = "Consent is required to publish your idea.";
    if (usedBytes > BUDGET_BYTES) er.images = "Images are too large for this proof of concept. Remove one or two.";
    setErrors(er);
    return Object.keys(er).length === 0;
  }

  function submit() {
    const proposal: CommunityProposal = {
      proposalId: nextProposalId(),
      title: f.title.trim(),
      category: f.category,
      islandPhase: f.islandPhase,
      locationText: f.locationText.trim(),
      pin: f.pin.trim(),
      canonicalPlaceId: f.canonicalPlaceId || undefined,
      whatChanges: f.whatChanges.trim(),
      benefit: f.benefit.trim(),
      impact: f.impact.trim(),
      photos,
      sketches,
      submittedAt: new Date().toISOString().slice(0, 10),
      submitterName: f.submitterName.trim(),
      contact: f.contact.trim() || undefined,
      wantsToCoCreate: f.wantsToCoCreate,
      status: "submitted",
      statusNote: "",
      supports: 0,
    };
    if (!saveLocalProposal(proposal)) {
      setSaveError("This browser could not store the idea (storage full). Remove some images and try again.");
      setStep("form");
      return;
    }
    setSavedId(proposal.proposalId);
    setStep("done");
  }

  const steps = [
    { key: "form", label: "1. Your idea" },
    { key: "review", label: "2. Review" },
    { key: "done", label: "3. Submitted" },
  ];
  const stepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="page">
      <h1>Suggest a change for Hulhumalé</h1>
      <p className="muted">
        Tell HDC what you would like to see built, changed or improved. Ideas are published on the Community Ideas
        page for others to support. HDC may invite you to co-create the project, or take it up for consideration.
      </p>
      <ol className="progress-steps" aria-label="Submission progress">
        {steps.map((s, i) => (
          <li key={s.key} className={`step ${i === stepIndex ? "current" : i < stepIndex ? "done" : ""}`}>
            {s.label}
          </li>
        ))}
      </ol>

      {step === "form" && (
        <form
          className="idea-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (validate()) setStep("review");
          }}
        >
          <div className="card">
            <h2 className="card-title">The idea</h2>
            <div className="form-field">
              <label htmlFor="i-title">Title</label>
              <input id="i-title" type="text" value={f.title} onChange={set("title")} aria-invalid={!!errors.title} placeholder="e.g. Shaded seating at the bus stops on Nirolhu Magu" />
              {errors.title && <p className="field-error" role="alert">{errors.title}</p>}
            </div>
            <div className="filter-row">
              <label className="form-field">
                Category
                <select value={f.category} onChange={set("category")}>
                  {PROPOSAL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="form-field">
                Island or phase
                <select value={f.islandPhase} onChange={set("islandPhase")}>
                  {PHASES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </label>
            </div>
            <div className="form-field">
              <label htmlFor="i-what">What would change or be built?</label>
              <p className="help-text">Describe the development or change you have in mind: what it is, roughly how big, who would use it.</p>
              <textarea id="i-what" value={f.whatChanges} onChange={set("whatChanges")} aria-invalid={!!errors.whatChanges} rows={5} />
              {errors.whatChanges && <p className="field-error" role="alert">{errors.whatChanges}</p>}
            </div>
            <div className="form-field">
              <label htmlFor="i-benefit">How would it benefit the community?</label>
              <textarea id="i-benefit" value={f.benefit} onChange={set("benefit")} aria-invalid={!!errors.benefit} rows={4} />
              {errors.benefit && <p className="field-error" role="alert">{errors.benefit}</p>}
            </div>
            <div className="form-field">
              <label htmlFor="i-impact">Any impacts or trade-offs to be aware of? <span className="muted">(optional)</span></label>
              <p className="help-text">Noise, parking, trees, cost, who might be affected. Honest answers help HDC take the idea seriously.</p>
              <textarea id="i-impact" value={f.impact} onChange={set("impact")} rows={3} />
            </div>
          </div>

          <div className="card">
            <h2 className="card-title">Location</h2>
            <div className="form-field">
              <label htmlFor="i-loc">Where is it?</label>
              <input id="i-loc" type="text" value={f.locationText} onChange={set("locationText")} aria-invalid={!!errors.locationText} placeholder="Street, block, park or landmark" />
              {errors.locationText && <p className="field-error" role="alert">{errors.locationText}</p>}
            </div>
            <div className="form-field">
              <span className="field-label">Drop a pin <span className="muted">(optional but helpful)</span></span>
              <MapPinPicker id="i-pin" value={f.pin} onChange={(v) => setF({ ...f, pin: v })} />
            </div>
            <label className="form-field">
              Related HDC place <span className="muted">(optional)</span>
              <select value={f.canonicalPlaceId} onChange={set("canonicalPlaceId")}>
                <option value="">Not sure / none</option>
                {places.map((p) => <option key={p.canonicalPlaceId} value={p.canonicalPlaceId}>{p.displayName}</option>)}
              </select>
            </label>
          </div>

          <div className="card">
            <h2 className="card-title">Photos and sketches</h2>
            <p className="help-text">
              Up to {MAX_IMAGES} photos of the place today and up to {MAX_IMAGES} concept sketches. Images are resized in your
              browser. {usedBytes > 0 && <span>Using about {Math.round(usedBytes / 1024)} KB.</span>}
            </p>
            {errors.images && <p className="field-error" role="alert">{errors.images}</p>}
            <ImageField label="Photos of the location" kind="photos" images={photos} onAdd={addImages} onRemove={removeImage} busy={busy} />
            <ImageField label="Concept sketches" kind="sketches" images={sketches} onAdd={addImages} onRemove={removeImage} busy={busy} />
          </div>

          <div className="card">
            <h2 className="card-title">About you</h2>
            <p className="help-text">Ideas can be anonymous. Leave a name if you want it shown, and a contact if you are open to being invited to co-create.</p>
            <div className="filter-row">
              <label className="form-field">
                Name shown with the idea <span className="muted">(optional)</span>
                <input type="text" value={f.submitterName} onChange={set("submitterName")} placeholder="e.g. Resident of Ward 3, or your name" />
              </label>
              <label className="form-field">
                Contact for HDC only <span className="muted">(optional)</span>
                <input type="text" value={f.contact} onChange={set("contact")} placeholder="Email or phone, never shown publicly" />
              </label>
            </div>
            <label className="consent-row">
              <input type="checkbox" checked={f.wantsToCoCreate} onChange={set("wantsToCoCreate")} />
              <span>I would like to be involved in developing this idea with HDC if it goes ahead.</span>
            </label>
            <label className="consent-row">
              <input type="checkbox" checked={f.consent} onChange={set("consent")} aria-invalid={!!errors.consent} />
              <span>
                I understand this is a proof of concept, my idea will be shown publicly on this site, and it is stored in this
                browser only. <span className="required-mark" aria-hidden="true">*</span>
              </span>
            </label>
            {errors.consent && <p className="field-error" role="alert">{errors.consent}</p>}
            {saveError && <p className="field-error" role="alert">{saveError}</p>}
          </div>

          <div className="panel-actions">
            <Link className="btn" to="/ideas">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={busy}>Review idea</button>
          </div>
        </form>
      )}

      {step === "review" && (
        <div className="card">
          <h2 className="card-title">Review your idea</h2>
          <dl className="review-list">
            <div><dt>Title</dt><dd>{f.title}</dd></div>
            <div><dt>Category and area</dt><dd>{f.category} · {f.islandPhase}</dd></div>
            <div><dt>Location</dt><dd>{f.locationText || "(pin only)"} {f.pin && <span className="alias-tag">{f.pin}</span>}</dd></div>
            <div><dt>What would change</dt><dd>{f.whatChanges}</dd></div>
            <div><dt>Benefit</dt><dd>{f.benefit}</dd></div>
            {f.impact && <div><dt>Impacts</dt><dd>{f.impact}</dd></div>}
            <div><dt>Images</dt><dd>{photos.length} photo{photos.length === 1 ? "" : "s"}, {sketches.length} sketch{sketches.length === 1 ? "" : "es"}</dd></div>
            <div><dt>Shown as</dt><dd>{f.submitterName || "Anonymous"}{f.wantsToCoCreate ? ", open to co-creating" : ""}</dd></div>
          </dl>
          <div className="panel-actions">
            <button type="button" className="btn" onClick={() => setStep("form")}>Edit</button>
            <button type="button" className="btn btn-primary" onClick={submit}>Submit idea</button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="card" role="status">
          <h2 className="card-title ok-text">Idea submitted</h2>
          <p>
            Thank you. Your idea is now on the Community Ideas page as <span className="alias-tag">{savedId}</span>. HDC
            staff review new ideas and update the status here. If they invite you to co-create, the invitation appears on
            the idea page.
          </p>
          <div className="panel-actions">
            <button type="button" className="btn btn-primary" onClick={() => navigate(`/ideas/${savedId}`)}>Open your idea</button>
            <Link className="btn" to="/ideas">All community ideas</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function ImageField({
  label,
  kind,
  images,
  onAdd,
  onRemove,
  busy,
}: {
  label: string;
  kind: "photos" | "sketches";
  images: ProposalImage[];
  onAdd(e: ChangeEvent<HTMLInputElement>, kind: "photos" | "sketches"): void;
  onRemove(kind: "photos" | "sketches", i: number): void;
  busy: boolean;
}) {
  const id = `i-${kind}`;
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="file" accept="image/*" multiple onChange={(e) => onAdd(e, kind)} disabled={busy || images.length >= MAX_IMAGES} />
      {images.length > 0 && (
        <ul className="image-grid">
          {images.map((img, i) => (
            <li key={`${img.name}-${i}`}>
              <img src={img.dataUrl} alt={img.name} />
              <button type="button" className="btn btn-sm" onClick={() => onRemove(kind, i)}>Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
