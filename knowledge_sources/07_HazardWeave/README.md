# HazardWeave: Vercel Full-Stack Prototype

A React + TypeScript + MapLibre dashboard with Vercel Functions and a switchable data-provider layer.

One GitHub repository and one Vercel project can serve both:

- the Vite/React frontend;
- `/api/*` server functions;
- AI/GIS orchestration;
- lightweight storage access.


## Frontend experience

The dashboard now includes a dark, command-centre interface designed for operational use rather than a generic admin template:

- responsive three-column workspace with map-first hierarchy;
- incident brief, analysis horizon and data-health controls;
- MapLibre dark basemap with styled flood, vulnerability, facility and incident layers;
- floating operational metrics, legend and timeline;
- AI copilot with context, suggested questions, evidence trace and human-review notice;
- ranked community table with priority index and export-ready layout;
- built-in browser mock fallback, so the interface remains usable before the API is connected.

The main presentation files are:

```text
src/App.tsx
src/styles.css
src/components/TopBar.tsx
src/components/LayerPanel.tsx
src/components/MapPanel.tsx
src/components/ChatPanel.tsx
src/components/BottomPanel.tsx
src/components/Icons.tsx
```

The default basemap is CARTO Dark Matter. Set `VITE_MAP_STYLE_URL` to use an institutional or custom MapLibre style.

## Core design

The frontend never connects directly to a particular database. It always calls the same routes:

```text
GET  /api/dashboard
POST /api/chat
GET  /api/health
POST /api/admin/seed
```

The server selects one provider through `DATA_PROVIDER`:

```text
mock      Built-in JSON for local development
blob      Vercel Blob JSON storage
external  Any external REST API implementing the dashboard contract
postgres  Any connected Postgres provider, such as Neon or Supabase
```

Changing providers does not require frontend code changes.

## Project structure

```text
hazardweave-dashboard/
├── api/                         Vercel Functions
│   ├── dashboard.ts
│   ├── chat.ts
│   ├── health.ts
│   └── admin/seed.ts
├── server/data/                 Provider abstraction
│   ├── index.ts
│   ├── provider.ts
│   ├── validate.ts
│   └── providers/
│       ├── mock.ts
│       ├── blob.ts
│       ├── external.ts
│       └── postgres.ts
├── shared/
│   ├── contracts.ts             Shared frontend/backend types
│   └── mockDataset.ts
├── src/                         React frontend
├── database/schema.sql
├── vercel.json
└── .env.example
```

## Local development

Install dependencies:

```bash
npm install
```

Frontend-only mode, with browser mock fallback:

```bash
npm run dev
```

Full-stack mode, including `/api` functions:

```bash
npm run dev:full
```

The full-stack command uses `vercel dev`.

## Provider selection

Copy the environment file:

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

### Automatic selection

```env
DATA_PROVIDER=auto
```

The current automatic priority is:

```text
DATABASE_URL
→ EXTERNAL_DATA_API_URL
→ BLOB_READ_WRITE_TOKEN
→ mock
```

For predictable production behaviour, explicitly set one of:

```env
DATA_PROVIDER=blob
DATA_PROVIDER=external
DATA_PROVIDER=postgres
DATA_PROVIDER=mock
```

## Option 1: Vercel Blob

This is appropriate for a lightweight pilot where the complete dashboard dataset is a relatively small JSON/GeoJSON document.

1. In Vercel, open the project.
2. Open **Storage** and create a Blob store.
3. Connect it to Production and Preview environments.
4. Set:

```env
DATA_PROVIDER=blob
BLOB_DATA_PATHNAME=hazardweave/dashboard-data.json
BLOB_ACCESS=private
ADMIN_API_KEY=replace-with-a-long-random-secret
```

Vercel adds `BLOB_READ_WRITE_TOKEN` when the store is connected.

Seed the initial demo dataset after deployment:

```bash
curl -X POST \
  -H "x-admin-key: YOUR_ADMIN_API_KEY" \
  https://YOUR_PROJECT.vercel.app/api/admin/seed
```

For Windows PowerShell:

```powershell
Invoke-RestMethod \
  -Method Post \
  -Headers @{ "x-admin-key" = "YOUR_ADMIN_API_KEY" } \
  -Uri "https://YOUR_PROJECT.vercel.app/api/admin/seed"
```

The Blob provider reads and writes:

```text
hazardweave/dashboard-data.json
```

## Option 2: external REST API

Use this when data is already hosted by ETDD, ArcGIS, a university server or another backend.

```env
DATA_PROVIDER=external
EXTERNAL_DATA_API_URL=https://example.org/api/
EXTERNAL_DATA_API_DASHBOARD_PATH=dashboard
EXTERNAL_DATA_API_TOKEN=
EXTERNAL_DATA_API_WRITE_ENABLED=false
```

The provider sends:

```http
GET https://example.org/api/dashboard
Authorization: Bearer <optional token>
```

The endpoint must return the `DashboardPayload` shape defined in:

```text
shared/contracts.ts
```

It may return either the payload directly or:

```json
{
  "data": {
    "layers": [],
    "map": {},
    "rows": [],
    "sources": [],
    "incident": {}
  }
}
```

Set `EXTERNAL_DATA_API_WRITE_ENABLED=true` only when the external endpoint supports `PUT` with the same payload.

## Option 3: connected Postgres

Use this when you need durable relational storage, filtering and a future path to PostGIS.

```env
DATA_PROVIDER=postgres
DATABASE_URL=postgresql://...
POSTGRES_DATASET_KEY=default
ADMIN_API_KEY=replace-with-a-long-random-secret
```

Run `database/schema.sql`, or call the protected seed endpoint. The provider stores one provider-neutral JSONB payload in:

```text
hazardweave_datasets
```

This intentionally keeps the first version portable. Later, facilities, incidents and communities can be normalised into PostGIS tables while `/api/dashboard` remains unchanged.

## API contract

### `GET /api/dashboard`

Returns:

```json
{
  "layers": [],
  "map": {
    "floodZones": { "type": "FeatureCollection", "features": [] },
    "vulnerabilityAreas": { "type": "FeatureCollection", "features": [] },
    "facilities": { "type": "FeatureCollection", "features": [] },
    "incidents": { "type": "FeatureCollection", "features": [] }
  },
  "rows": [],
  "sources": [],
  "incident": {},
  "provider": {
    "name": "blob",
    "label": "Vercel Blob JSON",
    "mutable": true,
    "source": "private blob: hazardweave/dashboard-data.json"
  },
  "generatedAt": "2026-07-28T21:00:00.000Z"
}
```

### `POST /api/chat`

Request:

```json
{
  "question": "Which facilities overlap flood risk?",
  "context": {
    "incidentId": "active-demo-event",
    "visibleLayers": ["flood", "facilities"]
  }
}
```

The current endpoint performs lightweight deterministic orchestration. It can later call an LLM without changing the frontend contract.

### `GET /api/health`

Checks the selected provider and reports its descriptor.

### `POST /api/admin/seed`

Writes the repository demo dataset into the active writable provider. It requires:

```http
x-admin-key: <ADMIN_API_KEY>
```

Remove or further restrict this route before a public operational deployment.

## Vercel deployment

1. Push the repository to GitHub.
2. Import that repository into one Vercel project.
3. Framework preset: Vite.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Add environment variables for the chosen provider.
7. Deploy.

`vercel.json` keeps `/api/*` as Functions while rewriting other paths to the Vite SPA.

## Storage guidance

- Use Blob for small JSON/GeoJSON snapshots, documents and uploaded files.
- Use connected Postgres when you need relational queries or later PostGIS.
- Use the external provider when another organisation already owns the authoritative service.
- Do not put LLM keys, database passwords or Blob tokens in variables beginning with `VITE_`; those values are exposed to the browser bundle.

## Live Tennessee flood intelligence

The dashboard now contains an independent set of official flood-intelligence layers. These are intentionally separated from the prototype/community overlays so the API contract used by the existing dashboard and chat endpoints remains stable.

### Included official sources

- **FEMA NFHL Flood Hazard Zones** — effective flood-hazard polygons queried for the current map extent from NFHL MapServer layer 28.
- **FEMA Regulatory Floodway** — floodway features filtered from the same effective NFHL response.
- **USGS Stream Gauges** — Tennessee instantaneous gage-height (`00065`) and discharge (`00060`) observations from USGS Water Services.
- **NOAA/NWS Observed River Stages** — Tennessee gauges and flood-status categories from the NWS River Gauges ArcGIS service.
- **NWS 24-hour River Forecast** — official forecast-status gauge layer from the same NWS service.
- **NWM 12-hour High Water Probability** — NOAA National Water Model dynamic map service, including high-water reaches and hotspot basins.

### Development modes

For the most reliable live-data test, run the Vercel Functions locally:

```bash
npm install
npm run dev:full
```

This exposes the same-origin proxy endpoints:

```text
/api/flood/fema?bbox=west,south,east,north
/api/flood/usgs
/api/flood/noaa?kind=observed
/api/flood/noaa?kind=forecast
```

If you use only:

```bash
npm run dev
```

the front end first attempts `/api/flood/*` and then, when `VITE_ALLOW_DIRECT_FLOOD_FALLBACK=true`, attempts the official public service directly. Browser CORS policy is controlled by each upstream provider, so `npm run dev:full` is the preferred live-data workflow.

### Important interpretation

FEMA NFHL is regulatory/effective flood-hazard mapping, not a statement of current inundation. NOAA/NWS observed gauges, NWS forecast gauges and NWM high-water probability are time-sensitive operational products. The UI keeps regulatory risk, current observations and forecast guidance separate so users do not confuse these products.

## Public community, insurance and assistance layers

Version 0.4 adds on-demand public data layers to the map. They are separate from the prototype/mock operational layers and from partner-restricted data.

```text
Community evidence
├── CDC Social Vulnerability Index 2022
├── ACS-derived (2018–2022) socioeconomic indicators
├── NFIP flood claims
├── NFIP policy records
├── FEMA Individual Assistance (RI-IHP)
└── OpenStreetMap community resources
```

The layers load only when enabled and are scoped to the current map view. NFIP and OSM layers also require a closer zoom before loading to limit traffic and keep the browser responsive.

### Local development behavior

With plain Vite:

```bash
npm run dev
```

CDC/ATSDR, OpenFEMA and OpenStreetMap are requested directly. The OSM loader automatically retries a second public Overpass mirror if the first is unavailable. The socioeconomic layer no longer calls the Census Data API directly; it uses ACS-derived fields published by CDC/ATSDR, so no Census API key is exposed in the browser.

For the closest match to Vercel production:

```bash
npm run dev:full
```

Set this in `.env.local` if needed:

```env
VITE_USE_VERCEL_PROXY=true
```

Then the frontend uses:

```text
/api/community/svi
/api/community/acs
/api/community/nfip
/api/community/ihp
/api/community/osm
```

See `PUBLIC_DATA_SOURCES.md` for data semantics and caveats. In particular, FEMA NFIP coordinates are intentionally treated as approximate locations, OSM is not a live help-request feed, and partner-only 211/Waze data are not fabricated.

## Data catalog organization (current UI)

The left panel now follows the six proposal evidence categories. Every category is collapsible:

1. Remote sensing and aerial imagery
2. Climate and hydrologic signals
3. Volunteered geographic information (VGI)
4. Help requests
5. Insurance and assistance information
6. Socioeconomic and vulnerability indicators

`Community & operations`, its prototype map overlays, and `NFIP Policy Records` have been removed from the map UI. The Help Requests category remains an explicit partner-integration slot and does not display synthetic request records.

## AI provider frontend preview

The AI panel now includes a model-agnostic provider selector for the planned production architecture:

- **HazardWeave Lite** — self-hosted small model routed server-to-server later;
- **OpenAI** — bring your own API key;
- **Anthropic Claude** — bring your own API key;
- **Google Gemini** — bring your own API key.

For the first frontend deployment, keep:

```env
VITE_AI_FRONTEND_PREVIEW=true
```

In this mode, the API-key field is visual/session-only and no key is transmitted. See `FRONTEND_PREVIEW.md` for deployment notes.
