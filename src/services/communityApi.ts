import {
  loadAcsSocioeconomicDirect,
  loadCdcSviDirect,
  loadFemaIhpDirect,
  loadNfipDirect,
  loadOsmCommunityResourcesDirect,
  type Bounds,
} from '../../shared/publicData';
import { normalizeFeatureCollection, type LooseFeatureCollection } from '../../shared/liveFlood';

const directFallback =
  String(import.meta.env.VITE_ALLOW_DIRECT_PUBLIC_DATA_FALLBACK ?? 'true') !== 'false';

const useVercelProxy =
  !import.meta.env.DEV ||
  String(import.meta.env.VITE_USE_VERCEL_PROXY ?? 'false') === 'true';

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || `${response.status} ${response.statusText}`);
  }
  return response.json();
}

function bboxParam(bounds: Bounds): string {
  return encodeURIComponent(bounds.join(','));
}

async function proxyOrDirect(
  proxyUrl: string,
  directLoader: () => Promise<LooseFeatureCollection>,
): Promise<LooseFeatureCollection> {
  if (!useVercelProxy) return directLoader();
  try {
    return normalizeFeatureCollection(await fetchJson(proxyUrl));
  } catch (error) {
    if (!directFallback) throw error;
    return directLoader();
  }
}

export function loadCdcSvi(bounds: Bounds) {
  return proxyOrDirect(`/api/community/svi?bbox=${bboxParam(bounds)}`, () => loadCdcSviDirect(bounds));
}

export function loadAcsSocioeconomic(bounds: Bounds) {
  return proxyOrDirect(`/api/community/acs?bbox=${bboxParam(bounds)}`, () => loadAcsSocioeconomicDirect(bounds));
}

export function loadNfipClaims(bounds: Bounds) {
  return proxyOrDirect(`/api/community/nfip?kind=claims&bbox=${bboxParam(bounds)}`, () => loadNfipDirect(bounds, 'claims'));
}

export function loadFemaIhp(bounds: Bounds) {
  return proxyOrDirect(`/api/community/ihp?bbox=${bboxParam(bounds)}`, () => loadFemaIhpDirect(bounds));
}

export function loadOsmResources(bounds: Bounds) {
  return proxyOrDirect(`/api/community/osm?bbox=${bboxParam(bounds)}`, () => loadOsmCommunityResourcesDirect(bounds));
}

