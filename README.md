# HDC Public Participation Portal — Proof of Concept

A frontend-only proof of concept for a map-based civic participation platform for Hulhumalé and HDC-managed areas.
The public can view planned developments, respond to active participation processes, and review completed decisions
with supporting data. Every participation record is linked to a GIS location through a **canonical place ID**.

> **Proof of Concept. Sample participation data only.** Nothing in this app is a real HDC decision.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview   # serve the production build
```

Sample responses/comments are pre-generated into `src/data/responses.json` / `src/data/comments.json`.
Regenerate deterministically with `npm run generate:responses`.

## Stack

React + Vite + TypeScript, ArcGIS Maps SDK for JavaScript (`@arcgis/core`), Apache ECharts, plain CSS,
local JSON data, localStorage for mock submissions and admin edits. No backend, no login, no environment variables.

## ArcGIS integration approach

The two supplied public HDC URLs are **Web AppBuilder application pages**, not layer URLs:

- 2D app item `21610169068e4dacaa51886ff9d4c300`
- 3D app item `ed90beef77b643a58570072cc9a14830`

`src/services/arcgis.ts`:

1. Extracts the item IDs from the URLs.
2. Calls the public ArcGIS sharing REST endpoint
   (`https://hulhumale.maps.arcgis.com/sharing/rest/content/items/<id>/data?f=json`) to read each app's
   configuration — anonymously, public metadata only, no scraping of private data.
3. Detects the underlying web map / web scene item ID from the app config (`map.itemId` / `values.webmap`).
4. Loads the detected web map in the main 2D `MapView`; a **3D View** button loads the detected web scene in a
   `SceneView`.

### Fallback map approach

If detection or loading fails (item private, network error, CORS), the app falls back to a streets/satellite basemap
centered on Hulhumalé. Local sample geometries (polygons, lines, points from `src/data/places.json`) are **always**
drawn as a graphics overlay, so the portal works fully offline from ArcGIS Online. A status note on the map explains
what was loaded or why fallback was used. If the ArcGIS SDK itself cannot start (e.g. no WebGL), a pure-SVG schematic
fallback (`MapFallback`) still shows all sample areas and remains clickable.

## Data harmonization approach

Different HDC departments label the same physical place differently (e.g. Estate plot `10078` vs Planning
`PLN/PH1/MU-78`). The model resolves this with **canonical place IDs** (`src/data/places.json`): each canonical place
holds geometry plus all known aliases (`estatePlotId`, `planningPlotId`, `gisObjectId`, `landUseCode`, `buildingId`,
`projectId`, `roadSegmentId`, `publicSpaceId`, `oldPlotReference`, `informalName`), each with source department,
source system, source ID, confidence score, and match status (`confirmed` / `ambiguous` / `unresolved`).
Participation records reference places only by canonical ID. The Admin Preview → **ID harmonization** screen shows the
alias table, flags ambiguous/unresolved matches, and lets a steward manually link records to places (saved to
localStorage in the POC).

## eFaas placeholder

Real eFaas is **not** integrated. The survey flow includes a mock verification modal showing the intended journey:
*Continue with eFaas → redirect placeholder → verified identity returned → submit response*, clearly labelled
"POC only. Real eFaas integration pending." No identity data is collected.

## HDC logo

The official HDC logo is bundled at `public/brand/hdc-logo.png` (sourced from the HDC brand CDN,
`https://hdccdn.blob.core.windows.net/brand/hdc/HDCLOGO-01.png`). To update it, replace that file. The `Logo`
component renders a text fallback ("HDC" / Housing Development Corporation) if the image is missing, so the layout
never breaks. Do not use old Urbanco branding.

## Moderation note

This POC displays **cleaned data only**. In the future backend, raw response datasets must be preserved unmodified
alongside cleaned public datasets, with a full moderation audit trail.

## What remains for the backend phase

- PostgreSQL + PostGIS, or ArcGIS hosted feature layers, replacing the local JSON files.
- Store consultation and participation responses in a secure database (replace localStorage).
- Separate raw datasets from cleaned public datasets; expose only approved cleaned datasets publicly.
- Preserve moderation audit trails (who removed what, when, why).
- Real eFaas identity verification where required.
- Server-side role-based access control matching the role matrix in the Admin Preview.
- Real document storage/downloads and dataset exports (PDF summary, cleaned CSV, response matrix).
- Canonical place IDs as the bridge between Estate, Planning, GIS, and project systems, with a managed
  harmonization service replacing the static alias table.

## Project structure

```
src/
  components/   reusable UI (map, filters, list, survey engine, charts, admin widgets)
  data/         sample POC JSON (records, places, responses, comments, moderation, roles, workflow)
  hooks/        filtering hook
  pages/        route-level pages (map home, records, detail, survey, results, admin, about)
  services/     arcgis.ts (map/scene + item detection), dataService.ts, storage.ts (localStorage)
  styles/       global.css
  types/        TypeScript domain models
scripts/        deterministic sample-data generator
public/brand/   HDC logo location
```
