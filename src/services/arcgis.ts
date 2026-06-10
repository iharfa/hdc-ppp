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
// Public AGOL items are reachable through www.arcgis.com regardless of the
// owning org's subdomain — and some networks block org subdomains.
const PORTAL_SHARING = "https://www.arcgis.com/sharing/rest";

// Public map/scene item IDs behind the two HDC apps, verified via the sharing
// REST API. Live detection (detectHdcSources) refreshes these at runtime; if
// that fetch fails (offline, CORS, transient), we still load by these IDs.
const KNOWN_WEBMAP_ID = "46865dadd00d48f0b23f87e9b49085b1";
const KNOWN_WEBSCENE_ID = "404e2256a01c44669287ac440ca258cd"; // "Land Use Plan Scene"

export const HULHUMALE_CENTER: [number, number] = [73.5425, 4.219];

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
  // Detection failed (transient network/CORS)? Fall back to the verified IDs
  // so the public HDC maps still load via the SDK's own request stack.
  if (!result.webmapId) {
    result.webmapId = KNOWN_WEBMAP_ID;
    notes.push("Using known public web map ID.");
  }
  if (!result.websceneId) {
    result.websceneId = KNOWN_WEBSCENE_ID;
    notes.push("Using known public web scene ID.");
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

// Matches the status label colours: Ongoing yellow, Completed green, Planned blue.
const STATUS_COLORS: Record<ParticipationStatus, [number, number, number]> = {
  Ongoing: [230, 176, 0],
  Completed: [22, 124, 66],
  Planned: [13, 110, 253],
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

  let detected: DetectedSource = { webmapId: KNOWN_WEBMAP_ID, websceneId: KNOWN_WEBSCENE_ID, message: "" };
  try {
    detected = await detectHdcSources();
  } catch {
    /* detection failed - keep known public item IDs */
  }

  if (detected.webmapId) {
    try {
      const webmap = new WebMap({ portalItem: { id: detected.webmapId } });
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
export async function createSceneView(
  container: HTMLDivElement,
  participationRecords: ParticipationRecord[] = [],
): Promise<{ destroy(): void; message: string }> {
  const [{ default: SceneView }, { default: WebScene }, { default: Map }, { default: GraphicsLayer }, { default: Graphic }] =
    await Promise.all([
      import("@arcgis/core/views/SceneView"),
      import("@arcgis/core/WebScene"),
      import("@arcgis/core/Map"),
      import("@arcgis/core/layers/GraphicsLayer"),
      import("@arcgis/core/Graphic"),
    ]);

  let message = "";
  let mapOrScene: InstanceType<typeof Map>;
  let sceneLoaded = false;
  const detected = await detectHdcSources().catch(() => ({
    webmapId: KNOWN_WEBMAP_ID,
    websceneId: KNOWN_WEBSCENE_ID,
    message: "detection failed; using known public item IDs",
  }));

  if (detected.websceneId) {
    try {
      const scene = new WebScene({ portalItem: { id: detected.websceneId } });
      await scene.load();
      mapOrScene = scene;
      sceneLoaded = true;
      message = `Loaded public HDC web scene (${detected.websceneId}). Click a lot for parcel details.`;
    } catch (e) {
      mapOrScene = new Map({ basemap: "satellite", ground: "world-elevation" });
      message = `HDC web scene could not be loaded publicly (${(e as Error).message}). Showing fallback 3D satellite view.`;
    }
  } else {
    mapOrScene = new Map({ basemap: "satellite", ground: "world-elevation" });
    message = "No public web scene detected. Showing fallback 3D satellite view of Hulhumalé.";
  }

  // Same participation pins as the 2D map, draped onto the scene.
  const overlay = new GraphicsLayer({ title: "Sample participation areas (POC)", elevationInfo: { mode: "relative-to-ground", offset: 5 } });
  for (const rec of participationRecords) {
    const place = getPlace(rec.canonicalPlaceId);
    if (!place) continue;
    const [lon, lat] = centroidOf(place.geometry);
    overlay.add(
      new Graphic({
        geometry: { type: "point", longitude: lon, latitude: lat } as unknown as __esri.GeometryUnion,
        symbol: pinSymbol(rec, false) as unknown as __esri.SymbolUnion,
        attributes: { recordId: rec.recordId, title: rec.title, status: rec.status },
      }),
    );
  }
  mapOrScene.add(overlay);

  // When the HDC scene loads, keep its saved viewpoint so extruded lot
  // buildings and styling appear exactly as in the published 3D app.
  // Only the fallback satellite view needs an explicit camera.
  const view = new SceneView({
    container,
    map: mapOrScene,
    ...(sceneLoaded
      ? {}
      : {
          camera: {
            position: { longitude: HULHUMALE_CENTER[0], latitude: HULHUMALE_CENTER[1] - 0.02, z: 2500 },
            tilt: 60,
          },
        }),
  });
  // Show attribute popups (parcel no, lot, land use, development, height,
  // area) even if a layer lacks an authored popup template.
  if (view.popup) view.popup.defaultPopupTemplateEnabled = true;
  await view.when().catch(() => {});
  if (sceneLoaded) {
    // Fly to Hulhumalé so the relevant lots are in view regardless of the
    // scene's saved island-wide viewpoint.
    view
      .goTo(
        { center: HULHUMALE_CENTER, zoom: 16, tilt: 55 },
        { duration: 1200 },
      )
      .catch(() => {});
  }
  return { destroy: () => view.destroy(), message };
}
