import { NavLink } from "react-router-dom";
import { Logo } from "./Logo";

const navItems = [
  { to: "/", label: "Map", end: true },
  { to: "/records", label: "Participation Records" },
  { to: "/results", label: "Results" },
  { to: "/admin", label: "Admin Preview" },
  { to: "/about", label: "About" },
];

export function Header() {
  return (
    <>
      <header className="site-header">
        <NavLink to="/" className="brand">
          <Logo />
          <span>
            <span className="brand-title">Public Participation Portal</span>
            <br />
            <span className="brand-sub">Housing Development Corporation</span>
          </span>
        </NavLink>
        <nav className="site-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? "active" : "")}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <div className="poc-banner" role="note">
        Proof of Concept. Sample participation data only.
      </div>
    </>
  );
}
