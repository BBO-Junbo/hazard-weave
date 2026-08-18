import {
  emptyFeatureCollection,
  normalizeFeatureCollection,
  parseUsgsInstantaneous,
  type LooseFeatureCollection,
  type UsgsInstantaneousPayload,
} from '../../shared/liveFlood';

const directFallback =
  String(import.meta.env.VITE_ALLOW_DIRECT_FLOOD_FALLBACK ?? 'true') !== 'false';

// Under plain `vite` development, `/api/*` is not a Vercel Function route.
// Calling it would make Vite try to serve/transform files under `api/`.
// Use direct official feeds locally, and use same-origin Vercel APIs in
// production or when explicitly enabled (e.g. through `vercel dev`).
const useVercelProxy =
  !import.meta.env.DEV ||
  String(import.meta.env.VITE_USE_VERCEL_PROXY ?? 'false') === 'true';

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function proxyThenDirect(
  proxyUrl: string,
  directUrl: string,
): Promise<unknown> {
  if (!useVercelProxy) {
    return fetchJson(directUrl);
  }

  try {
    return await fetchJson(proxyUrl);
  } catch (proxyError) {
    if (!directFallback) throw proxyError;
    return fetchJson(directUrl);
  }
}

export async function loadFemaFloodHazard(
  bounds: [number, number, number, number],
): Promise<LooseFeatureCollection> {
  const bbox = bounds.join(',');
  const proxyUrl = `/api/flood/fema?bbox=${encodeURIComponent(bbox)}`;
  const direct = new URL(
    'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query',
  );
  direct.searchParams.set('where', '1=1');
  direct.searchParams.set('geometry', bbox);
  direct.searchParams.set('geometryType', 'esriGeometryEnvelope');
  direct.searchParams.set('inSR', '4326');
  direct.searchParams.set('outSR', '4326');
  direct.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
  direct.searchParams.set('outFields', 'OBJECTID,FLD_AR_ID,FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE,V_DATUM');
  direct.searchParams.set('returnGeometry', 'true');
  direct.searchParams.set('resultRecordCount', '2000');
  direct.searchParams.set('f', 'geojson');
  const payload = await proxyThenDirect(proxyUrl, direct.toString());
  return normalizeFeatureCollection(payload);
}

export async function loadUsgsTennesseeGauges(): Promise<LooseFeatureCollection> {
  const direct =
    'https://waterservices.usgs.gov/nwis/iv/?format=json&stateCd=tn&parameterCd=00060,00065&siteStatus=active';
  const payload = await proxyThenDirect('/api/flood/usgs', direct);

  if (
    payload &&
    typeof payload === 'object' &&
    (payload as Record<string, unknown>).type === 'FeatureCollection'
  ) {
    return normalizeFeatureCollection(payload);
  }
  return parseUsgsInstantaneous(payload as UsgsInstantaneousPayload);
}

export async function loadNoaaTennesseeGauges(
  kind: 'observed' | 'forecast',
): Promise<LooseFeatureCollection> {
  const layerId = kind === 'observed' ? 0 : 1;
  const direct = new URL(
    `https://mapservices.weather.noaa.gov/eventdriven/rest/services/water/riv_gauges/MapServer/${layerId}/query`,
  );
  direct.searchParams.set('where', "state='TN'");
  direct.searchParams.set('outFields', '*');
  direct.searchParams.set('returnGeometry', 'true');
  direct.searchParams.set('outSR', '4326');
  direct.searchParams.set('f', 'geojson');

  const payload = await proxyThenDirect(
    `/api/flood/noaa?kind=${kind}`,
    direct.toString(),
  );
  return normalizeFeatureCollection(payload);
}
