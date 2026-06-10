# HDC GIS data backup (redundancy)

This folder is an automated snapshot of the public HDC ArcGIS data behind the
portal's maps, kept in git as redundancy in case access to the live services
is lost.

## What is backed up

| Path | Contents |
|---|---|
| `gis/items/*.meta.json` | ArcGIS Online portal item metadata (apps, web map, web scene) |
| `gis/items/*.data.json` | Full item definitions — the web map / web scene JSON needed to re-publish them |
| `gis/features/*.geojson` | **Complete feature data** (all attributes + geometry, WGS84) for every feature layer: Lot Layer (land use, development, heights), roads, building/lot labels, bridge, reclamation |
| `gis/services/*.json` | Service and layer metadata for every referenced service, including all imagery tile services |
| `gis/manifest.json` | What was captured, from which URL, when, and anything skipped or failed |

## What is NOT backed up (and why)

Raster **imagery tile caches** (drone orthomosaics on `gis.hdc.mv`) are tens of
gigabytes and unsuitable for a git repo. Their service metadata is stored so
they can be re-published, but the source orthomosaic files must be backed up
on HDC infrastructure separately. **Treat this as a priority** — the imagery
source files exist only on the GIS server today.

## How it runs

- Manually: `node scripts/gisBackup.mjs`
- Automatically: GitHub Actions (`.github/workflows/gis-backup.yml`) runs every
  Sunday and commits changes only when the data actually changed. You can also
  trigger it from the repo's Actions tab ("Run workflow").

## Restoring

- **Feature data**: the `.geojson` files load directly into QGIS/ArcGIS Pro, or
  can be re-published as hosted feature layers (geometry is WGS84 / EPSG:4326).
- **Web map / scene**: re-create the portal item and paste the `.data.json`
  content as the item definition (ArcGIS "Add Item" / API `addItem` with `text`).
- **Services**: `.service.json` files document the original configuration
  (tiling scheme, extents, layer definitions) for re-publishing.
