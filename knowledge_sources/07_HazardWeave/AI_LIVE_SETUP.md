# HazardWeave AI live routing

This version replaces the UI-only AI preview with a real model router at `POST /api/chat`.

## What is implemented

- Model providers:
  - HazardWeave Lite: self-hosted OpenAI-compatible endpoint configured on Vercel.
  - OpenAI: BYOK.
  - Anthropic Claude: BYOK.
  - Google Gemini: BYOK.
- BYOK keys are held in React memory, sent only in the individual `/api/chat` request, and are not persisted by HazardWeave code.
- Three server-side tools:
  - `getFloodStatus`
  - `getCommunityVulnerability`
  - `getAssistanceSummary`
- The current map bounds, zoom, time selection, county selection and visible data layers are sent as chat context.
- Tool results produce evidence sources and map actions. The corresponding map layers are turned on automatically.

## Important first-version limits

This version does **not** yet have a computed exposure/priority tool, current 211/311 help-request data, or a parcel-level observed inundation tool. The system prompt explicitly forbids the model from pretending these are available.

## Install dependencies

After replacing the files, run:

```powershell
npm install
npm run build
npm run typecheck:api
```

Commit both `package.json` and the updated `package-lock.json`.

## Vercel environment variables

Set:

```text
VITE_AI_FRONTEND_PREVIEW=false
```

This is a Vite build-time variable, so redeploy after changing it.

### HazardWeave Lite

The hosted small model is optional while you test BYOK providers.

```text
HAZARDWEAVE_LLM_URL=http://PUBLIC_IP:PORT/v1
HAZARDWEAVE_LLM_MODEL=your-openai-compatible-model-id
HAZARDWEAVE_LLM_TOKEN=optional-shared-secret
```

`HAZARDWEAVE_LLM_URL` may be an HTTP public IP during testing because Vercel calls it server-to-server; the browser never calls that IP directly.

Your model gateway must expose an OpenAI-compatible endpoint and support tool/function calling for the full first-version workflow.

## BYOK behavior

For OpenAI / Claude / Gemini:

1. User selects the provider.
2. User enters their own model ID and API key.
3. Browser sends the key to `/api/chat` over HTTPS with that one request.
4. The Vercel Function creates the provider client and calls the selected model.
5. HazardWeave code does not store the key.

Do not add request-body logging to `/api/chat`.

## Local testing

For live Vercel Functions locally, use:

```powershell
npm run dev:full
```

For a UI-only demo with plain Vite, set:

```text
VITE_AI_FRONTEND_PREVIEW=true
```

and run:

```powershell
npm run dev
```

## Test questions

Use a reasonably zoomed-in East Tennessee map view, then try:

- `What is the current flood situation in this map view?`
- `Which census tracts appear most socially vulnerable here, and why?`
- `What FEMA and NFIP assistance data are available in this map view?`

Expected behavior:

- Flood question -> NOAA/NWS + USGS tools, and gauge layers turn on.
- Vulnerability question -> CDC SVI + ACS-derived data, and those layers turn on.
- Assistance question -> NFIP Claims + FEMA IHP, and those layers turn on.

A question such as `Which communities are most exposed right now?` should **not** receive a fabricated ranking yet. The assistant should explain that a computed exposure tool is not connected in this first version.
