import type { ParticipationRecord } from "../types";
import { getPlace } from "../services/dataService";
import { HULHUMALE_CENTER } from "../services/arcgis";
import { StatusBadge } from "./StatusBadge";

interface Props {
  message: string;
  records: ParticipationRecord[];
  selectedId: string | null;
  onSelect(recordId: string): void;
}

/**
 * Pure-SVG schematic map used only when the ArcGIS SDK itself fails to start
 * (e.g. offline, WebGL unavailable). Plots sample geometries on a plain grid.
 */
export function MapFallback({ message, records, selectedId, onSelect }: Props) {
  const [cx, cy] = HULHUMALE_CENTER;
  const scale = 22000;
  const project = ([lon, lat]: [number, number]) => [350 + (lon - cx) * scale, 250 - (lat - cy) * scale];

  return (
    <div className="map-container" style={{ background: "#eef3f7", display: "flex", flexDirection: "column" }}>
      <div className="map-status-note" style={{ position: "static", margin: "0.75rem" }} role="alert">
        {message} Showing a schematic offline fallback of the sample participation areas.
      </div>
      <svg viewBox="0 0 700 500" style={{ flex: 1, width: "100%" }} role="img" aria-label="Schematic map of sample participation areas">
        {records.map((r) => {
          const place = getPlace(r.canonicalPlaceId);
          if (!place) return null;
          const sel = r.recordId === selectedId;
          const color = r.status === "Ongoing" ? "#0d6efd" : r.status === "Planned" ? "#198754" : "#6c757d";
          const common = {
            stroke: color,
            strokeWidth: sel ? 4 : 2,
            cursor: "pointer" as const,
            onClick: () => onSelect(r.recordId),
          };
          const g = place.geometry;
          if (g.type === "point") {
            const [x, y] = project(g.coordinates);
            return <circle key={r.recordId} cx={x} cy={y} r={sel ? 10 : 7} fill={color} {...common} />;
          }
          if (g.type === "line") {
            const pts = g.coordinates.map(project).map((p) => p.join(",")).join(" ");
            return <polyline key={r.recordId} points={pts} fill="none" {...common} />;
          }
          const pts = g.coordinates[0].map(project).map((p) => p.join(",")).join(" ");
          return <polygon key={r.recordId} points={pts} fill={color} fillOpacity={0.25} {...common} strokeDasharray={r.status === "Planned" ? "6 4" : undefined} />;
        })}
      </svg>
      <ul style={{ listStyle: "none", margin: 0, padding: "0.5rem 0.75rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", fontSize: "0.78rem" }}>
        {records.map((r) => (
          <li key={r.recordId}>
            <button type="button" className="btn btn-sm" onClick={() => onSelect(r.recordId)}>
              <StatusBadge status={r.status} /> {r.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
