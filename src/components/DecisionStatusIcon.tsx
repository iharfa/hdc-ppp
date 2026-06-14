import type { DecisionStatus } from "../types";

// SVG glyph + colour per decision outcome. Icon always accompanies the text
// label, so meaning never relies on colour alone.
const ICONS: Record<DecisionStatus, { color: string; path: string }> = {
  // check mark
  Approved: { color: "#0f8f46", path: "M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" },
  // check mark (amended) — teal accent to distinguish from plain approval
  "Approved with amendments": { color: "#00a6a6", path: "M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" },
  // half-filled circle
  "Partially approved": { color: "#b54708", path: "M12 2a10 10 0 1 0 0 20V2z" },
  // cross
  Rejected: { color: "#b42318", path: "M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 5.7 18.3 4.3 16.9 10.6 12 4.3 5.7 5.7 4.3 12 10.6l4.9-4.9z" },
  // clock (deferred)
  Deferred: { color: "#495057", path: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 5h-2v6l5 3 1-1.7-4-2.3z" },
};

export function DecisionStatusIcon({ status, size = 18 }: { status: DecisionStatus; size?: number }) {
  const icon = ICONS[status];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role="img"
      aria-label={`Decision outcome: ${status}`}
      style={{ flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="11" fill={icon.color} opacity="0.12" />
      <path d={icon.path} fill={icon.color} transform="scale(0.72) translate(4.7 4.7)" />
    </svg>
  );
}
