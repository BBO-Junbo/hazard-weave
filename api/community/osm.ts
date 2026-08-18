import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadOsmCommunityResourcesDirect } from '../../shared/publicData.js';
import { cachePublic } from '../../server/flood.js';
import { parseBboxQuery } from '../../server/community.js';
import { allowMethods, errorResponse } from '../../server/http.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (!allowMethods(request, response, ['GET'])) return;
  try {
    const result = await loadOsmCommunityResourcesDirect(parseBboxQuery(request.query.bbox));
    cachePublic(response, 1800);
    response.status(200).json(result);
  } catch (error) {
    errorResponse(response, error, 400);
  }
}
