import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getRecords } from "../services/dataService";
import { sortRecords } from "../hooks/useRecordFilters";
import { ProjectCard } from "../components/ProjectCard";

const PHASE_ORDER = ["Hulhumalé Phase 1", "Hulhumalé Phase 1-2 Link", "Hulhumalé Phase 2"];

export function HomePage() {
  const records = useMemo(() => sortRecords(getRecords()), []);
  const featured = records.filter((r) => r.featured).slice(0, 3);
  const ongoingCount = records.filter((r) => r.status === "Ongoing").length;
  const heroImage = featured[0]?.image ?? records.find((r) => r.image)?.image;

  const phases = useMemo(() => {
    const seen = [...new Set(records.map((r) => r.islandPhase))];
    return [...PHASE_ORDER.filter((p) => seen.includes(p)), ...seen.filter((p) => !PHASE_ORDER.includes(p))];
  }, [records]);
  const [phase, setPhase] = useState(phases[0] ?? "");
  const phaseRecords = records.filter((r) => r.islandPhase === phase);

  return (
    <div className="home">
      <section className="home-hero home-inner">
        <div className="home-hero-copy">
          <h1>Have your say on how Hulhumalé grows</h1>
          <p className="lead">
            The Public Participation Portal is where HDC shares planned developments, asks residents for feedback, and
            publishes the decisions that follow. Every project is tied to a real place on the map.
          </p>
          <p className="muted">
            {ongoingCount === 0
              ? "No processes are open right now. Planned ones are listed below."
              : `${ongoingCount} ${ongoingCount === 1 ? "process is" : "processes are"} open for feedback right now.`}
          </p>
          <div className="panel-actions">
            <Link className="btn btn-primary" to="/records">
              Browse participation
            </Link>
            <Link className="btn" to="/map">
              Open the map
            </Link>
          </div>
        </div>
        {heroImage && (
          <figure className="home-hero-figure">
            <img src={heroImage} alt="" {...{ fetchpriority: "high" }} />
            <figcaption className="muted">Representative image, illustrative only</figcaption>
          </figure>
        )}
      </section>

      {featured.length > 0 && (
        <section className="home-band" aria-labelledby="featured-title">
          <div className="home-inner">
            <h2 id="featured-title">Featured</h2>
            <p className="muted">The processes we most want to hear from you on right now.</p>
            <div className="feature-grid">
              {featured.map((r) => (
                <ProjectCard key={r.recordId} record={r} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="home-inner phase-section" aria-labelledby="phase-title">
        <div className="phase-rail">
          <h2 id="phase-title">Projects by phase</h2>
          <p className="muted">Ongoing, upcoming and completed participation, grouped by the part of Hulhumalé they affect.</p>
          <div className="phase-tabs" role="tablist" aria-label="Island phase">
            {phases.map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={phase === p}
                className={phase === p ? "active" : ""}
                onClick={() => setPhase(p)}
              >
                {p.replace("Hulhumalé ", "")}
                <span className="phase-count">{records.filter((r) => r.islandPhase === p).length}</span>
              </button>
            ))}
          </div>
          <Link className="link-toggle" to="/records">
            All participation records
          </Link>
        </div>
        <div className="phase-grid" role="tabpanel">
          {phaseRecords.length === 0 ? (
            <div className="empty-state">No participation records for this phase yet.</div>
          ) : (
            phaseRecords.map((r) => <ProjectCard key={r.recordId} record={r} />)
          )}
        </div>
      </section>

      <section className="home-inner home-how" aria-labelledby="how-title">
        <h2 id="how-title">How it works</h2>
        <ol className="how-steps">
          <li>
            <strong>HDC publishes a proposal</strong>
            <span>Plans, documents and the location appear here and on the map before anything is built.</span>
          </li>
          <li>
            <strong>You respond</strong>
            <span>Answer a short survey, anonymously. Drop a pin if your comment is about a specific spot.</span>
          </li>
          <li>
            <strong>Responses are reviewed</strong>
            <span>The Socio-Environmental Planning Section moderates and analyses what came in.</span>
          </li>
          <li>
            <strong>The decision is published</strong>
            <span>Results, common themes and the final decision are posted back on the same record.</span>
          </li>
        </ol>
      </section>
    </div>
  );
}
