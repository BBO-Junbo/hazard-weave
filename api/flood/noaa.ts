import type { VercelRequest, VercelResponse } from '@vercel/node';
import { normalizeFeatureCollection } from '../../shared/liveFlood.js';
import { fetchOfficialJson, cachePublic } from '../../server/flood.js';
import { allowMethods, errorResponse } from '../../server/http.js';

function getKind(value: unknown): 'observed' | 'forecast' {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'forecast' ? 'forecast' : 'observed';
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (!allowMethods(request, response, ['GET'])) return;

  try {
    const kind = getKind(request.query.kind);
    const layerId = kind === 'observed' ? 0 : 1;
    const url = new URL(
      `https://mapservices.weather.noaa.gov/eventdriven/rest/services/water/riv_gauges/MapServer/${layerId}/query`,
    );
    url.searchParams.set('where', "state='TN'");
    url.searchParams.set('outFields', '*');
    url.searchParams.set('returnGeometry', 'true');
    url.searchParams.set('outSR', '4326');
    url.searchParams.set('f', 'geojson');

    const payload = await fetchOfficialJson(url.toString(), 20_000);
    const result = normalizeFeatureCollection(payload);
    cachePublic(response, 300);
    response.status(200).json(result);
  } catch (error) {
    errorResponse(response, error);
  }
}
