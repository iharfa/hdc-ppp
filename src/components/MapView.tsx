import { useEffect, useRef, useState } from "react";
import type { ParticipationRecord } from "../types";
import { createMapView, createSceneView, type MapHandle } from "../services/arcgis";
import { MapFallback } from "./MapFallback";

interface HoverInfo {
  recordId: string;
  title: string;
  status: string;
  x: number;
  y: number;
}

interface Props {
  records: ParticipationRecord[];
  selectedId: string | null;
  onSelect(recordId: string): void;
}

export function MapView({ records, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<MapHandle | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const [sceneMsg, setSceneMsg] = useState("");

  // (Re)create the view whenever the record set or mode changes.
  useEffect(() => {
    let cancelled = false;
    let destroy: (() => void) | null = null;
    setLoading(true);
    setFatalError(null);
    setHover(null);

    const container = containerRef.current;
    if (!container) return;
    const div = document.createElement("div");
    div.style.height = "100%";
    container.appendChild(div);

    if (mode === "2d") {
      createMapView(div, records, {
        onFeatureClick: (id) => onSelectRef.current(id),
        onHover: (info) => setHover(info),
      })
        .then((handle) => {
          if (cancelled) {
            handle.destroy();
            return;
          }
          handleRef.current = handle;
          destroy = () => handle.destroy();
          setStatusMsg(handle.statusMessage);
          setLoading(false);
        })
        .catch((e: Error) => {
          if (!cancelled) {
            setFatalError(`The interactive map could not be started (${e.message}).`);
            setLoading(false);
          }
        });
    } else {
      createSceneView(div, records)
        .then((scene) => {
          if (cancelled) {
            scene.destroy();
            return;
          }
          destroy = () => scene.destroy();
          setSceneMsg(scene.message);
          setLoading(false);
        })
        .catch((e: Error) => {
          if (!cancelled) {
            setFatalError(`The 3D view could not be started (${e.message}).`);
            setLoading(false);
          }
        });
    }

    return () => {
      cancelled = true;
      handleRef.current = null;
      destroy?.();
      div.remove();
    };
  }, [records, mode]);

  useEffect(() => {
    handleRef.current?.selectRecord(selectedId);
  }, [selectedId]);

  if (fatalError) {
    return <MapFallback message={fatalError} records={records} selectedId={selectedId} onSelect={onSelect} />;
  }

  return (
    <div className="map-container">
      <div className="map-toolbar" style={{ position: "absolute", top: "0.75rem", right: "0.75rem", zIndex: 5, border: "1px solid var(--grey-300)", borderRadius: 8 }}>
        <button type="button" className={`btn btn-sm ${mode === "2d" ? "btn-blue" : ""}`} onClick={() => setMode("2d")} aria-pressed={mode === "2d"}>
          2D Map
        </button>
        <button type="button" className={`btn btn-sm ${mode === "3d" ? "btn-blue" : ""}`} onClick={() => setMode("3d")} aria-pressed={mode === "3d"}>
          3D View
        </button>
      </div>
      <div ref={containerRef} style={{ height: "100%" }} />
      {loading && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--grey-100)" }}>
          <div className="spinner" aria-label="Loading map" />
        </div>
      )}
      {hover && mode === "2d" && (
        <div className="map-tooltip" style={{ left: hover.x, top: hover.y }}>
          <strong>{hover.title}</strong>
          <br />
          Status: {hover.status}
        </div>
      )}
      {!loading && (statusMsg || sceneMsg) && (
        <div className="map-status-note" role="note">
          {mode === "2d" ? statusMsg : sceneMsg} Sample participation overlays are POC data.
        </div>
      )}
    </div>
  );
}
