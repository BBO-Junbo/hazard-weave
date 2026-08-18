import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { UsgsInstantaneousPayload } from '../../shared/liveFlood';
import { parseUsgsInstantaneous } from '../../shared/liveFlood';
import { fetchOfficialJson, cachePublic } from '../../server/flood';
import { allowMethods, errorResponse } from '../../server/http';

const SERVICE =
  'https://waterservices.usgs.gov/nwis/iv/?format=json&stateCd=tn&parameterCd=00060,00065&siteStatus=active';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (!allowMethods(request, response, ['GET'])) return;

  try {
    const payload = (await fetchOfficialJson(SERVICE, 20_000)) as UsgsInstantaneousPayload;
    const result = parseUsgsInstantaneous(payload);
    cachePublic(response, 300);
    response.status(200).json(result);
  } catch (error) {
    errorResponse(response, error);
  }
}
