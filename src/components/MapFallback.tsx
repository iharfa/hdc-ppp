import type { ParticipationRecord } from "../types";
import { getPlace } from "../services/dataService";
import { HULHUMALE_CENTER, centroidOf } from "../services/arcgis";
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
          const color = r.status === "Ongoing" ? "#e6b000" : r.status === "Planned" ? "#0d6efd" : r.status === "Completed" ? "#167c42" : "#6c757d";
          const [x, y] = project(centroidOf(place.geometry));
          const pinScale = sel ? 1.6 : r.status === "Ongoing" ? 1.3 : 1;
          return (
            <g
              key={r.recordId}
              transform={`translate(${x - 12 * pinScale}, ${y - 24 * pinScale}) scale(${pinScale})`}
              cursor="pointer"
              onClick={() => onSelect(r.recordId)}
            >
              <title>{`${r.title} — ${r.status}`}</title>
              <path
                d="M12 0C7 0 3 4 3 9c0 6.2 8.1 14.3 8.4 14.7.3.3.9.3 1.2 0C12.9 23.3 21 15.2 21 9c0-5-4-9-9-9z"
                fill={r.status === "Planned" ? "#ffffff" : color}
                stroke={sel ? "#ffc400" : r.status === "Planned" ? color : "#ffffff"}
                strokeWidth={sel ? 2.5 : 1.5}
              />
              <circle cx={12} cy={9} r={3.5} fill={r.status === "Planned" ? color : "#ffffff"} />
            </g>
          );
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
