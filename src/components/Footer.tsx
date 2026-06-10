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
            A proof of concept for map-based public participation, survey response collection, consultation result
            disclosure, and data harmonization across HDC-managed areas.
            <br />
          </span>
          <span className="muted">Proof of Concept. Sample participation data only.</span>
        </div>
      </div>
    </footer>
  );
}
