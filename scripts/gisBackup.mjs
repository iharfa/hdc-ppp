// HDC GIS redundancy crawler.
//
// Walks the public HDC ArcGIS application items -> web map / web scene ->
// operational layers, and stores everything restorable into backup/gis/:
//
//   backup/gis/items/<itemId>.meta.json   portal item metadata
//   backup/gis/items/<itemId>.data.json   portal item data (map/scene definition)
//   backup/gis/services/<name>.service.json   service + layer metadata
//   backup/gis/features/<name>.geojson    full feature data (paginated query)
//   backup/gis/manifest.json              what was backed up, when, from where
//
// Tile/imagery services (gis.hdc.mv MapServer caches) are far too large for a
// git repo, so for those we store the service metadata needed to re-publish,
// and record the source URL in the manifest.
//
// Run: node scripts/gisBackup.mjs
// Designed to also run headlessly in GitHub Actions (see .github/workflows/gis-backup.yml).

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "backup", "gis");
const SHARING = "https://www.arcgis.com/sharing/rest";

// Entry points: the two public HDC application items.
const APP_ITEMS = [
  { id: "21610169068e4dacaa51886ff9d4c300", label: "2D Web App" },
  { id: "ed90beef77b643a58570072cc9a14830", label: "3D Web App (LUP)" },
];

const MAX_FEATURES_PER_LAYER = 200000; // safety cap
const manifest = {
  generatedAt: new Date().toISOString(),
  source: "Public HDC ArcGIS Online items and services. Backup for redundancy.",
  items: [],
  services: [],
  featureLayers: [],
  skipped: [],
  errors: [],
};

async function getJson(url, attempt = 1) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "hdc-gis-backup/1.0" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(`ArcGIS error ${json.error.code}: ${json.error.message}`);
    return json;
  } catch (e) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      return getJson(url, attempt + 1);
    }
    throw e;
  }
}

function save(relPath, data) {
  const full = join(OUT, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, typeof data === "string" ? data : JSON.stringify(data, null, 1));
  return relPath;
}

function safeName(s) {
  return s.replace(/[^a-z0-9_-]+/gi, "_").replace(/_+/g, "_").slice(0, 80);
}

async function backupItem(itemId, label) {
  const meta = await getJson(`${SHARING}/content/items/${itemId}?f=json`);
  const data = await getJson(`${SHARING}/content/items/${itemId}/data?f=json`);
  save(`items/${itemId}.meta.json`, meta);
  save(`items/${itemId}.data.json`, data);
  manifest.items.push({ itemId, label, title: meta.title, type: meta.type, access: meta.access });
  console.log(`[item] ${label}: ${meta.title} (${meta.type})`);
  return { meta, data };
}

/** Page through a feature layer and save all features as GeoJSON. */
async function backupFeatureLayer(layerUrl, title) {
  const name = safeName(title || layerUrl.split("/").slice(-3).join("_"));
  const layerMeta = await getJson(`${layerUrl}?f=json`);

  // FeatureServer root vs single layer URL: expand to each sublayer.
  if (layerMeta.layers && !layerMeta.geometryType) {
    save(`services/${name}.service.json`, layerMeta);
    for (const sub of layerMeta.layers) {
      await backupFeatureLayer(`${layerUrl}/${sub.id}`, `${title}_${sub.name}`);
    }
    return;
  }

  save(`services/${name}.layer.json`, layerMeta);
  const pageSize = Math.min(layerMeta.maxRecordCount || 1000, 2000);
  const features = [];
  let offset = 0;
  for (;;) {
    const page = await getJson(
      `${layerUrl}/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson&resultOffset=${offset}&resultRecordCount=${pageSize}`,
    );
    const got = page.features?.length ?? 0;
    features.push(...(page.features ?? []));
    offset += got;
    if (got < pageSize || offset >= MAX_FEATURES_PER_LAYER) break;
  }
  save(`features/${name}.geojson`, { type: "FeatureCollection", backupOf: layerUrl, features });
  manifest.featureLayers.push({ title, url: layerUrl, featureCount: features.length, file: `features/${name}.geojson` });
  console.log(`[features] ${title}: ${features.length} features`);
}

/** Store metadata for tile/map services whose caches are too big for git. */
async function backupServiceMetadata(serviceUrl, title) {
  const name = safeName(title || serviceUrl.split("/").slice(-2).join("_"));
  const meta = await getJson(`${serviceUrl}?f=json`);
  save(`services/${name}.service.json`, meta);
  manifest.services.push({ title, url: serviceUrl, type: "tile/map service (metadata only)", file: `services/${name}.service.json` });
  manifest.skipped.push({ title, url: serviceUrl, reason: "Tile cache too large for git backup; metadata stored for re-publishing." });
  console.log(`[service-meta] ${title}`);
}

async function walkOperationalLayers(layers, seen) {
  for (const layer of layers ?? []) {
    const url = layer.url;
    const title = layer.title || layer.id || "layer";
    try {
      if (layer.layers) await walkOperationalLayers(layer.layers, seen); // group layers
      if (!url || seen.has(url)) continue;
      seen.add(url);
      const type = (layer.layerType || "").toLowerCase();
      if (type.includes("feature") || /FeatureServer/i.test(url)) {
        await backupFeatureLayer(url, title);
      } else {
        await backupServiceMetadata(url, title);
      }
    } catch (e) {
      manifest.errors.push({ title, url, error: e.message });
      console.warn(`[error] ${title}: ${e.message}`);
    }
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const seen = new Set();

  for (const app of APP_ITEMS) {
    try {
      const { data } = await backupItem(app.id, app.label);
      const mapItemId = data?.map?.itemId || data?.values?.webmap || data?.webmap;
      if (!mapItemId) continue;
      const { data: mapData } = await backupItem(mapItemId, `${app.label} -> map/scene`);
      await walkOperationalLayers(mapData.operationalLayers, seen);
      // Basemap layers from HDC's own servers are worth recording too.
      const basemapLayers = mapData.baseMap?.baseMapLayers?.filter((l) => l.url && !/arcgisonline|arcgis\.com\/.*World/i.test(l.url));
      await walkOperationalLayers(basemapLayers, seen);
    } catch (e) {
      manifest.errors.push({ item: app.id, error: e.message });
      console.warn(`[error] app ${app.id}: ${e.message}`);
    }
  }

  save("manifest.json", manifest);
  const prev = join(OUT, "manifest.json");
  console.log(`\nBackup complete: ${manifest.items.length} items, ${manifest.featureLayers.length} feature layers, ` +
    `${manifest.services.length} service metadata files, ${manifest.errors.length} errors.`);
  if (manifest.errors.length > 0 && manifest.featureLayers.length === 0 && existsSync(prev)) {
    console.warn("Nothing new fetched; previous backup left untouched.");
  }
  // Non-zero exit if the backup is essentially empty, so CI flags it.
  if (manifest.items.length === 0) process.exit(1);
}

main().catch((e) => {
  console.error("Backup failed:", e);
  process.exit(1);
});
