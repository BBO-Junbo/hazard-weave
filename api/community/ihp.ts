import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadFemaIhpDirect } from '../../shared/publicData';
import { cachePublic } from '../../server/flood';
import { parseBboxQuery } from '../../server/community';
import { allowMethods, errorResponse } from '../../server/http';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (!allowMethods(request, response, ['GET'])) return;
  try {
    const result = await loadFemaIhpDirect(parseBboxQuery(request.query.bbox));
    cachePublic(response, 21_600);
    response.status(200).json(result);
  } catch (error) {
    errorResponse(response, error, 400);
  }
}
