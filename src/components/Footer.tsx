import { Logo } from "./Logo";

/** Ft2 inline single-line footer: wordmark, tagline, affiliation, POC note. */
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <span className="footer-brand">
          <Logo dark />
          <span>
            <strong>Housing Development Corporation</strong>
            <span className="footer-blurb">Public Participation Portal for Hulhumalé</span>
          </span>
        </span>
        <span className="footer-note muted">Proof of concept. Sample participation data only.</span>
        <a
          className="m20-badge"
          href="https://digital.gov.mv/pillars/"
          target="_blank"
          rel="noopener noreferrer"
          title="Maldives 2.0, Pillar 6: Citizen-Centric and Business-Friendly Digital Public Services"
        >
          <span className="m20-badge-label">Part of</span>
          <img src="/brand/maldives-2.0.svg" alt="Maldives 2.0" />
          <span className="m20-badge-sub">Pillar 6</span>
        </a>
      </div>
    </footer>
  );
}
