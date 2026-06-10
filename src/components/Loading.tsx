import { Logo } from "./Logo";

export function Loading({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <Logo dark showName />
      <div className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}
