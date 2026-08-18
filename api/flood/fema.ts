import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchOfficialJson, cachePublic } from '../../server/flood';
import { allowMethods, errorResponse } from '../../server/http';
import { normalizeFeatureCollection } from '../../shared/liveFlood';

const SERVICE =
  'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query';

function parseBbox(value: unknown): [number, number, number, number] {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') throw new Error('bbox is required.');
  const values = raw.split(',').map(Number);
  if (values.length !== 4 || values.some((item) => !Number.isFinite(item))) {
    throw new Error('bbox must be west,south,east,north.');
  }
  const [west, south, east, north] = values;
  if (west >= east || south >= north) throw new Error('bbox is invalid.');
  // Keep this pilot endpoint scoped to the southeastern U.S. and prevent accidental huge queries.
  if (east - west > 3.5 || north - south > 3.5) {
    throw new Error('bbox is too large; zoom in before requesting FEMA polygons.');
  }
  return [west, south, east, north];
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (!allowMethods(request, response, ['GET'])) return;

  try {
    const bbox = parseBbox(request.query.bbox);
    const url = new URL(SERVICE);
    url.searchParams.set('where', '1=1');
    url.searchParams.set('geometry', bbox.join(','));
    url.searchParams.set('geometryType', 'esriGeometryEnvelope');
    url.searchParams.set('inSR', '4326');
    url.searchParams.set('outSR', '4326');
    url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
    url.searchParams.set('outFields', 'OBJECTID,FLD_AR_ID,FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE,V_DATUM');
    url.searchParams.set('returnGeometry', 'true');
    url.searchParams.set('resultRecordCount', '2000');
    url.searchParams.set('maxAllowableOffset', '0.00003');
    url.searchParams.set('f', 'geojson');

    const payload = await fetchOfficialJson(url.toString(), 20_000);
    const result = normalizeFeatureCollection(payload);
    cachePublic(response, 3600);
    response.status(200).json(result);
  } catch (error) {
    errorResponse(response, error, 400);
  }
}
