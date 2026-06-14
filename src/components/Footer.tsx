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
      </div>
    </footer>
  );
}
