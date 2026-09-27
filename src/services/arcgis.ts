// ArcGIS integration, kept separate from UI components.
//
// The two supplied HDC URLs are Web AppBuilder application pages, not layer URLs:
//   2D app item: 21610169068e4dacaa51886ff9d4c300
//   3D app item: ed90beef77b643a58570072cc9a14830
// The public web map / web scene behind them were resolved once via the
// sharing REST API and are pinned below (see backup/gis/items for the raw
// item JSON). Any load failure falls back to a basemap centered on Hulhumale
// with local sample geometries overlaid. No private data is read.
import type { Geometry, ParticipationRecord, ParticipationStatus } from "../types";
import { effectivePlaceId, getPlace } from "./dataService";

export const APP_ITEM_2D = "21610169068e4dacaa51886ff9d4c300";
export const APP_ITEM_3D = "ed90beef77b643a58570072cc9a14830";
// Public map/scene item IDs behind the two HDC apps ("DRONE IMAGERY" web map,
// "Land Use Plan Scene" web scene). Re-run scripts/gisBackup.mjs to re-verify.
export const WEBMAP_ID = "46865dadd00d48f0b23f87e9b49085b1";
export const WEBSCENE_ID = "404e2256a01c44669287ac440ca258cd";

export const HULHUMALE_CENTER: [number, number] = [73.5425, 4.219];

// ---- Map view creation ----------------------------------------------------

export interface MapHandle {
  destroy(): void;
  setRecords(records: ParticipationRecord[]): void;
  selectRecord(recordId: string | null): void;
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

type GraphicCtor = typeof import("@arcgis/core/Graphic").default;

/** Outline of the place (polygon ring or line) drawn beneath the pin so the affected area is visible. */
function shapeGraphic(Graphic: GraphicCtor, rec: ParticipationRecord) {
  const place = getPlace(effectivePlaceId(rec));
  if (!place || place.geometry.type === "point") return null;
  const rgb = STATUS_COLORS[rec.status];
  const geometry =
    place.geometry.type === "polygon"
      ? { type: "polygon", rings: place.geometry.coordinates }
      : { type: "polyline", paths: [place.geometry.coordinates] };
  const symbol =
    place.geometry.type === "polygon"
      ? { type: "simple-fill", color: [...rgb, 0.18], outline: { color: [...rgb, 0.9], width: 1.5 } }
      : { type: "simple-line", color: [...rgb, 0.9], width: 4 };
  return new Graphic({
    geometry: geometry as unknown as __esri.GeometryUnion,
    symbol: symbol as unknown as __esri.SymbolUnion,
    attributes: { recordId: rec.recordId, title: rec.title, status: rec.status },
  });
}

function pinGraphic(Graphic: GraphicCtor, rec: ParticipationRecord, selected: boolean) {
  const place = getPlace(effectivePlaceId(rec));
  if (!place) return null;
  const [lon, lat] = centroidOf(place.geometry);
  return new Graphic({
    geometry: { type: "point", longitude: lon, latitude: lat } as unknown as __esri.GeometryUnion,
    symbol: pinSymbol(rec, selected) as unknown as __esri.SymbolUnion,
    attributes: { recordId: rec.recordId, title: rec.title, status: rec.status },
  });
}

/**
 * Create the main 2D map once. Tries the public HDC web map first; on any
 * failure falls back to a streets basemap centered on Hulhumale. Sample
 * participation pins live in a graphics overlay that setRecords() swaps
 * without rebuilding the view.
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
  try {
    const webmap = new WebMap({ portalItem: { id: WEBMAP_ID } });
    await webmap.load();
    map = webmap;
    statusMessage = "Showing the public HDC web map.";
  } catch (e) {
    usedFallback = true;
    map = new Map({ basemap: "streets-vector" });
    statusMessage = `HDC web map could not be loaded (${(e as Error).message}). Showing fallback basemap.`;
  }

  const overlay = new GraphicsLayer({ title: "Sample participation areas (POC)" });
  map.add(overlay);

  let records = participationRecords;
  let selectedId: string | null = null;
  const graphicsByRecord = new globalThis.Map<string, InstanceType<typeof Graphic>>();

  function redraw() {
    overlay.removeAll();
    graphicsByRecord.clear();
    for (const rec of records) {
      const shape = shapeGraphic(Graphic, rec);
      if (shape) overlay.add(shape);
    }
    for (const rec of records) {
      const g = pinGraphic(Graphic, rec, rec.recordId === selectedId);
      if (!g) continue;
      overlay.add(g);
      graphicsByRecord.set(rec.recordId, g);
    }
  }
  redraw();

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
    setRecords(next) {
      records = next;
      redraw();
    },
    selectRecord(recordId) {
      selectedId = recordId;
      for (const rec of records) {
        const g = graphicsByRecord.get(rec.recordId);
        if (g) g.symbol = pinSymbol(rec, rec.recordId === selectedId) as unknown as __esri.SymbolUnion;
      }
      const g = recordId ? graphicsByRecord.get(recordId) : undefined;
      if (g?.geometry) view.goTo({ target: g.geometry, zoom: 17 }, { duration: 600 }).catch(() => {});
    },
  };
}

/** Create a 3D scene view from the public web scene, with fallback. */
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
  try {
    const scene = new WebScene({ portalItem: { id: WEBSCENE_ID } });
    await scene.load();
    mapOrScene = scene;
    sceneLoaded = true;
    message = "Showing the public HDC Land Use Plan scene. Click a lot for parcel details.";
  } catch (e) {
    mapOrScene = new Map({ basemap: "satellite", ground: "world-elevation" });
    message = `HDC web scene could not be loaded (${(e as Error).message}). Showing fallback 3D satellite view.`;
  }

  // Same participation pins as the 2D map, draped onto the scene.
  const overlay = new GraphicsLayer({ title: "Sample participation areas (POC)", elevationInfo: { mode: "relative-to-ground", offset: 5 } });
  for (const rec of participationRecords) {
    const shape = shapeGraphic(Graphic, rec);
    if (shape) overlay.add(shape);
    const g = pinGraphic(Graphic, rec, false);
    if (g) overlay.add(g);
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
    view.goTo({ center: HULHUMALE_CENTER, zoom: 16, tilt: 55 }, { duration: 1200 }).catch(() => {});
  }
  return { destroy: () => view.destroy(), message };
}

/**
 * Small map for the survey "map pin" question. Click places (or moves) a
 * single marker and reports it back as [lon, lat].
 */
export async function createPinPicker(
  container: HTMLDivElement,
  initial: [number, number] | null,
  onPick: (lonLat: [number, number]) => void,
): Promise<{ destroy(): void }> {
  const [{ default: Map }, { default: MapView }, { default: WebMap }, { default: GraphicsLayer }, { default: Graphic }] =
    await Promise.all([
      import("@arcgis/core/Map"),
      import("@arcgis/core/views/MapView"),
      import("@arcgis/core/WebMap"),
      import("@arcgis/core/layers/GraphicsLayer"),
      import("@arcgis/core/Graphic"),
    ]);
  let map: InstanceType<typeof Map>;
  try {
    const webmap = new WebMap({ portalItem: { id: WEBMAP_ID } });
    await webmap.load();
    map = webmap;
  } catch {
    map = new Map({ basemap: "streets-vector" });
  }
  const layer = new GraphicsLayer();
  map.add(layer);
  const view = new MapView({ container, map, center: initial ?? HULHUMALE_CENTER, zoom: initial ? 17 : 15, popupEnabled: false, ui: { components: ["zoom"] } });
  function place(lon: number, lat: number) {
    layer.removeAll();
    layer.add(
      new Graphic({
        geometry: { type: "point", longitude: lon, latitude: lat } as unknown as __esri.GeometryUnion,
        symbol: { type: "simple-marker", path: PIN_PATH, color: STATUS_COLORS.Ongoing, size: 28, yoffset: 14, outline: { color: [255, 255, 255, 1], width: 1.5 } } as unknown as __esri.SymbolUnion,
      }),
    );
  }
  if (initial) place(initial[0], initial[1]);
  const handle = view.on("click", (event) => {
    const pt = event.mapPoint;
    if (!pt?.longitude || !pt.latitude) return;
    place(pt.longitude, pt.latitude);
    onPick([pt.longitude, pt.latitude]);
  });
  await view.when().catch(() => {});
  return {
    destroy() {
      handle.remove();
      view.destroy();
    },
  };
}
