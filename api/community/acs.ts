import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadAcsSocioeconomicDirect } from '../../shared/publicData.js';
import { cachePublic } from '../../server/flood.js';
import { parseBboxQuery } from '../../server/community.js';
import { allowMethods, errorResponse } from '../../server/http.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (!allowMethods(request, response, ['GET'])) return;
  try {
    const result = await loadAcsSocioeconomicDirect(parseBboxQuery(request.query.bbox));
    cachePublic(response, 86_400);
    response.status(200).json(result);
  } catch (error) {
    errorResponse(response, error, 400);
  }
}
