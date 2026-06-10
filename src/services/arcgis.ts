// ArcGIS integration, kept separate from UI components.
//
// The two supplied HDC URLs are Web AppBuilder application pages, not layer URLs:
//   2D app item: 21610169068e4dacaa51886ff9d4c300
//   3D app item: ed90beef77b643a58570072cc9a14830
// We query the public ArcGIS sharing REST API (f=json, no login) for each app
// item's /data to detect the underlying web map / web scene item ID, then load
// that with the ArcGIS Maps SDK. Any failure falls back to a basemap centered
// on Hulhumalé with local sample geometries overlaid. No private data is read.
import type { Geometry, ParticipationRecord, ParticipationStatus } from "../types";
import { getPlace } from "./dataService";

export const APP_ITEM_2D = "21610169068e4dacaa51886ff9d4c300";
export const APP_ITEM_3D = "ed90beef77b643a58570072cc9a14830";
const PORTAL_SHARING = "https://hulhumale.maps.arcgis.com/sharing/rest";

export const HULHUMALE_CENTER: [number, number] = [73.54, 4.2185];

export interface DetectedSource {
  webmapId: string | null;
  websceneId: string | null;
  message: string;
}

async function fetchJson(url: string, timeoutMs = 8000): Promise<Record<string, unknown>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as Record<string, unknown>;
    if (json.error) throw new Error("Portal item is not publicly accessible");
    return json;
  } finally {
    clearTimeout(timer);
  }
}

/** Extract the map/scene item ID from a Web AppBuilder app config. */
function extractMapItemId(appData: Record<string, unknown>): string | null {
  const map = appData.map as Record<string, unknown> | undefined;
  if (map && typeof map.itemId === "string") return map.itemId;
  const values = appData.values as Record<string, unknown> | undefined;
  if (values && typeof values.webmap === "string") return values.webmap;
  if (typeof appData.webmap === "string") return appData.webmap;
  return null;
}

/** Detect the public web map and web scene behind the two HDC app items. */
export async function detectHdcSources(): Promise<DetectedSource> {
  const result: DetectedSource = { webmapId: null, websceneId: null, message: "" };
  const notes: string[] = [];
  try {
    const data = await fetchJson(`${PORTAL_SHARING}/content/items/${APP_ITEM_2D}/data?f=json`);
    result.webmapId = extractMapItemId(data);
    notes.push(result.webmapId ? `Detected public web map ${result.webmapId}.` : "2D app config did not expose a web map ID.");
  } catch (e) {
    notes.push(`Could not read 2D app config (${(e as Error).message}).`);
  }
  try {
    const data = await fetchJson(`${PORTAL_SHARING}/content/items/${APP_ITEM_3D}/data?f=json`);
    result.websceneId = extractMapItemId(data);
    notes.push(result.websceneId ? `Detected public web scene ${result.websceneId}.` : "3D app config did not expose a web scene ID.");
  } catch (e) {
    notes.push(`Could not read 3D app config (${(e as Error).message}).`);
  }
  result.message = notes.join(" ");
  return result;
}

// ---- Map view creation ----------------------------------------------------

export interface MapHandle {
  destroy(): void;
  selectRecord(recordId: string | null): void;
  goTo3D(): Promise<string | null>; // returns error message or null
  usedFallback: boolean;
  statusMessage: string;
}

export interface MapCallbacks {
  onFeatureClick?(recordId: string): void;
  onHover?(info: { recordId: string; title: string; status: string; x: number; y: number } | null): void;
}

const STATUS_COLORS: Record<ParticipationStatus, [number, number, number]> = {
  Ongoing: [13, 110, 253],
  Completed: [108, 117, 125],
  Planned: [25, 135, 84],
  "Internal Review": [255, 153, 0],
  Closed: [73, 80, 87],
};

/** Representative pin location (centroid) for any place geometry. */
export function centroidOf(geom: Geometry): [number, number] {
  if (geom.type === "point") return geom.coordinates;
  const pts = geom.type === "line" ? geom.coordinates : geom.coordinates[0];
  const sum = pts.reduce<[number, number]>((acc, [x, y]) => [acc[0] + x, acc[1] + y], [0, 0]);
  return [sum[0] / pts.length, sum[1] / pts.length];
}

// Classic teardrop map-pin path (24x24 viewbox), rendered as an SVG marker.
const PIN_PATH =
  "M12 0C7 0 3 4 3 9c0 6.2 8.1 14.3 8.4 14.7.3.3.9.3 1.2 0C12.9 23.3 21 15.2 21 9c0-5-4-9-9-9zm0 12.5A3.5 3.5 0 1 1 12 5.5a3.5 3.5 0 0 1 0 7z";

/** Pin symbol for a participation record. Ongoing pins stand out; completed are muted; planned use an outlined style. */
function pinSymbol(record: ParticipationRecord, selected: boolean) {
  const rgb = STATUS_COLORS[record.status];
  const ongoing = record.status === "Ongoing";
  const planned = record.status === "Planned";
  return {
    type: "simple-marker" as const,
    path: PIN_PATH,
    color: planned ? [255, 255, 255, 0.9] : [...rgb, ongoing ? 1 : 0.75],
    size: selected ? 34 : ongoing ? 28 : 22,
    outline: {
      color: selected ? [255, 196, 0, 1] : planned ? [...rgb, 1] : [255, 255, 255, 1],
      width: selected ? 3 : planned ? 2.5 : 1.5,
    },
    yoffset: selected ? 17 : ongoing ? 14 : 11, // anchor the pin tip on the location
  };
}

/**
 * Create the main 2D map. Tries the detected HDC web map first; on any failure
 * falls back to a streets/satellite basemap centered on Hulhumalé. Sample
 * participation geometries are always drawn as a local graphics overlay.
 */
export async function createMapView(
  container: HTMLDivElement,
  participationRecords: ParticipationRecord[],
  callbacks: MapCallbacks,
): Promise<MapHandle> {
  const [{ default: Map }, { default: MapView }, { default: WebMap }, { default: GraphicsLayer }, { default: Graphic }] =
    await Promise.all([
      import("@arcgis/core/Map"),
      import("@arcgis/core/views/MapView"),
      import("@arcgis/core/WebMap"),
      import("@arcgis/core/layers/GraphicsLayer"),
      import("@arcgis/core/Graphic"),
    ]);

  let usedFallback = false;
  let statusMessage = "";
  let map: InstanceType<typeof Map>;

  let detected: DetectedSource = { webmapId: null, websceneId: null, message: "" };
  try {
    detected = await detectHdcSources();
  } catch {
    /* network failure - fall through to fallback */
  }

  if (detected.webmapId) {
    try {
      const webmap = new WebMap({ portalItem: { id: detected.webmapId, portal: { url: "https://hulhumale.maps.arcgis.com" } } });
      await webmap.load();
      map = webmap;
      statusMessage = `Loaded public HDC web map (${detected.webmapId}).`;
    } catch (e) {
      usedFallback = true;
      map = new Map({ basemap: "streets-vector" });
      statusMessage = `HDC web map could not be loaded publicly (${(e as Error).message}). Showing fallback basemap with sample overlays.`;
    }
  } else {
    usedFallback = true;
    map = new Map({ basemap: "streets-vector" });
    statusMessage = detected.message
      ? `${detected.message} Showing fallback basemap with sample overlays.`
      : "HDC web map unavailable. Showing fallback basemap with sample overlays.";
  }

  const overlay = new GraphicsLayer({ title: "Sample participation areas (POC)" });
  map.add(overlay);

  const graphicsByRecord = new globalThis.Map<string, InstanceType<typeof Graphic>>();
  for (const rec of participationRecords) {
    const place = getPlace(rec.canonicalPlaceId);
    if (!place) continue;
    const [lon, lat] = centroidOf(place.geometry);
    const graphic = new Graphic({
      geometry: { type: "point", longitude: lon, latitude: lat } as unknown as __esri.GeometryUnion,
      symbol: pinSymbol(rec, false) as unknown as __esri.SymbolUnion,
      attributes: { recordId: rec.recordId, title: rec.title, status: rec.status },
    });
    overlay.add(graphic);
    graphicsByRecord.set(rec.recordId, graphic);
  }

  const view = new MapView({
    container,
    map,
    center: HULHUMALE_CENTER,
    zoom: 15,
    constraints: { minZoom: 11 },
    popupEnabled: false,
  });

  try {
    await view.when();
  } catch (e) {
    statusMessage += ` Map view error: ${(e as Error).message}`;
  }

  let selectedId: string | null = null;
  function applySymbols() {
    for (const rec of participationRecords) {
      const g = graphicsByRecord.get(rec.recordId);
      if (g) g.symbol = pinSymbol(rec, rec.recordId === selectedId) as unknown as __esri.SymbolUnion;
    }
  }

  const clickHandle = view.on("click", async (event) => {
    try {
      const hit = await view.hitTest(event, { include: overlay });
      const result = hit.results.find((r) => r.type === "graphic") as __esri.GraphicHit | undefined;
      const recordId = result?.graphic.attributes?.recordId as string | undefined;
      if (recordId) callbacks.onFeatureClick?.(recordId);
    } catch {
      /* hit test failed - ignore */
    }
  });

  let hoverScheduled = false;
  const moveHandle = view.on("pointer-move", (event) => {
    if (hoverScheduled) return;
    hoverScheduled = true;
    view
      .hitTest(event, { include: overlay })
      .then((hit) => {
        hoverScheduled = false;
        const result = hit.results.find((r) => r.type === "graphic") as __esri.GraphicHit | undefined;
        const attrs = result?.graphic.attributes;
        if (attrs?.recordId) {
          view.container!.style.cursor = "pointer";
          callbacks.onHover?.({ recordId: attrs.recordId, title: attrs.title, status: attrs.status, x: event.x, y: event.y });
        } else {
          view.container!.style.cursor = "default";
          callbacks.onHover?.(null);
        }
      })
      .catch(() => {
        hoverScheduled = false;
      });
  });

  return {
    usedFallback,
    statusMessage,
    destroy() {
      clickHandle.remove();
      moveHandle.remove();
      view.destroy();
    },
    selectRecord(recordId: string | null) {
      selectedId = recordId;
      applySymbols();
      if (recordId) {
        const g = graphicsByRecord.get(recordId);
        if (g?.geometry) {
          view.goTo({ target: g.geometry, zoom: 17 }, { duration: 600 }).catch(() => {});
        }
      }
    },
    async goTo3D() {
      return detected.websceneId ? null : "No public web scene detected for the 3D app.";
    },
  };
}

/** Create a 3D scene view from the detected web scene, with fallback. */
export async function createSceneView(container: HTMLDivElement): Promise<{ destroy(): void; message: string }> {
  const [{ default: SceneView }, { default: WebScene }, { default: Map }] = await Promise.all([
    import("@arcgis/core/views/SceneView"),
    import("@arcgis/core/WebScene"),
    import("@arcgis/core/Map"),
  ]);

  let message = "";
  let mapOrScene: InstanceType<typeof Map>;
  const detected = await detectHdcSources().catch(() => ({ webmapId: null, websceneId: null, message: "detection failed" }));

  if (detected.websceneId) {
    try {
      const scene = new WebScene({ portalItem: { id: detected.websceneId, portal: { url: "https://hulhumale.maps.arcgis.com" } } });
      await scene.load();
      mapOrScene = scene;
      message = `Loaded public HDC web scene (${detected.websceneId}).`;
    } catch (e) {
      mapOrScene = new Map({ basemap: "satellite", ground: "world-elevation" });
      message = `HDC web scene could not be loaded publicly (${(e as Error).message}). Showing fallback 3D satellite view.`;
    }
  } else {
    mapOrScene = new Map({ basemap: "satellite", ground: "world-elevation" });
    message = "No public web scene detected. Showing fallback 3D satellite view of Hulhumalé.";
  }

  const view = new SceneView({
    container,
    map: mapOrScene,
    camera: {
      position: { longitude: HULHUMALE_CENTER[0], latitude: HULHUMALE_CENTER[1] - 0.02, z: 2500 },
      tilt: 60,
    },
  });
  await view.when().catch(() => {});
  return { destroy: () => view.destroy(), message };
}
