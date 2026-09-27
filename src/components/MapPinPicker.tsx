import { useEffect, useRef, useState } from "react";
import { createPinPicker } from "../services/arcgis";

interface Props {
  id: string;
  value: string; // "lat, lon" or ""
  onChange(value: string): void;
  invalid?: boolean;
}

function parse(value: string): [number, number] | null {
  const m = value.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  return m ? [Number(m[2]), Number(m[1])] : null; // stored as lat, lon; map wants lon, lat
}

/** Survey map-pin input: click the map to drop a marker. Value is "lat, lon". */
export function MapPinPicker({ id, value, onChange, invalid }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    let destroy: (() => void) | null = null;
    createPinPicker(el, parse(value), ([lon, lat]) => onChangeRef.current(`${lat.toFixed(5)}, ${lon.toFixed(5)}`))
      .then((h) => {
        if (cancelled) h.destroy();
        else destroy = h.destroy;
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      destroy?.();
    };
    // Mount once; the picker keeps its own marker in sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pin-picker">
      {!failed && <div ref={ref} className="pin-picker-map" aria-label="Map: click to place a pin" />}
      <label htmlFor={id} className="muted">
        Selected location (latitude, longitude){failed ? ", type it in" : ""}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        placeholder="Click the map, or enter 4.2190, 73.5425"
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
      />
    </div>
  );
}
