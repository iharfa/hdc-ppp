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

function toArcgisGeometry(geom: Geometry) {
  if (geom.type === "point") {
    return { type: "point" as const, longitude: geom.coordinates[0], latitude: geom.coordinates[1] };
  }
  if (geom.type === "line") {
    return { type: "polyline" as const, paths: [geom.coordinates] };
  }
  return { type: "polygon" as const, rings: geom.coordinates };
}

function symbolFor(record: ParticipationRecord, geom: Geometry, selected: boolean) {
  const rgb = STATUS_COLORS[record.status];
  const ongoing = record.status === "Ongoing";
  const planned = record.status === "Planned";
  const alpha = ongoing ? 0.45 : planned ? 0.15 : 0.25;
  const outlineWidth = selected ? 4 : ongoing ? 2.5 : 1.5;
  if (geom.type === "point") {
    return {
      type: "simple-marker" as const,
      color: [...rgb, ongoing ? 0.9 : 0.6],
      size: selected ? 16 : ongoing ? 14 : 10,
      outline: { color: [255, 255, 255, 1], width: 2 },
    };
  }
  if (geom.type === "line") {
    return {
      type: "simple-line" as const,
      color: [...rgb, ongoing ? 1 : 0.7],
      width: outlineWidth + 1,
      style: planned ? ("short-dash" as const) : ("solid" as const),
    };
  }
  return {
    type: "simple-fill" as const,
    color: [...rgb, alpha],
    style: planned ? ("backward-diagonal" as const) : ("solid" as const),
    outline: {
      color: [...rgb, 1],
      width: outlineWidth,
      style: planned ? ("dash" as const) : ("solid" as const),
    },
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
    const graphic = new Graphic({
      geometry: toArcgisGeometry(place.geometry) as unknown as __esri.GeometryUnion,
      symbol: symbolFor(rec, place.geometry, false) as unknown as __esri.SymbolUnion,
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
      const place = getPlace(rec.canonicalPlaceId);
      if (g && place) g.symbol = symbolFor(rec, place.geometry, rec.recordId === selectedId) as unknown as __esri.SymbolUnion;
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
