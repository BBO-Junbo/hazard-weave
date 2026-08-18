# HazardWeave Frontend Preview

This build is intentionally safe for UI review before live LLM routing is connected.

## What works

- Vite/React/MapLibre dashboard
- switchable TDOT / USDA NAIP / dark basemaps
- live/public data layers already present in the project
- collapsible proposal-aligned data catalog
- AI provider selector:
  - HazardWeave Lite (future self-hosted endpoint)
  - OpenAI (BYOK)
  - Anthropic Claude (BYOK)
  - Google Gemini (BYOK)
- provider-specific model ID field
- masked API-key field
- provider-aware demo chat responses

## Important preview behavior

`VITE_AI_FRONTEND_PREVIEW=true` means:

- no live LLM request is made;
- a BYOK API key is held only in React memory;
- the key is not written to localStorage or sessionStorage;
- the key is not included in `/api/chat` requests;
- refreshing the page clears the key.

This is the recommended setting for the first Vercel UI deployment.

## Local run

```bash
npm install
npm run dev
```

The Vite URL is normally `http://localhost:5173`.

## Production build check

```bash
npm run build
npm run preview
```

## First Vercel deployment

Connect the Git repository in Vercel and deploy the repository root containing `package.json` and `vercel.json`.

Recommended environment variable for Preview and Production during UI testing:

```env
VITE_AI_FRONTEND_PREVIEW=true
```

No LLM API secret is required for this deployment.

## Later: enable live AI routing

After `/api/chat` has the provider router and tool registry:

```env
VITE_AI_FRONTEND_PREVIEW=false
```

At that point:

- `HazardWeave Lite` should be routed by the Vercel server function to the research-server LLM endpoint;
- BYOK credentials should be forwarded transiently by `/api/chat` to an allowlisted provider;
- the browser should never directly call the research-server IP;
- API keys should never be persisted or logged.
