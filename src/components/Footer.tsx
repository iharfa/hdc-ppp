import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Logo dark />
        <div>
          <strong>Housing Development Corporation</strong>
          <br />
          Public Participation Portal
          <br />
          <span className="footer-blurb">
            Open governance, public participation, and data-informed decision making for Hulhumalé.
            <br />
          </span>
          <span className="muted">Proof of Concept. Sample participation data only.</span>
        </div>
        <a
          className="m20-badge"
          href="https://digital.gov.mv/pillars/"
          target="_blank"
          rel="noopener noreferrer"
          title="Maldives 2.0 — Pillar 6: Citizen-Centric and Business-Friendly Digital Public Services"
        >
          <span className="m20-badge-label">Part of</span>
          <img src="/brand/maldives-2.0.svg" alt="Maldives 2.0" />
          <span className="m20-badge-sub">Pillar 6 · Citizen-Centric &amp; Business-Friendly Digital Public Services</span>
        </a>
      </div>
    </footer>
  );
}
