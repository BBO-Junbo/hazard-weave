import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDataProvider } from '../server/data';
import { allowMethods, errorResponse } from '../server/http';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (!allowMethods(request, response, ['GET'])) return;

  try {
    const provider = await getDataProvider();
    const health = await provider.health();
    response.status(health.ok ? 200 : 503).json({
      ...health,
      descriptor: provider.descriptor,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    errorResponse(response, error, 503);
  }
}
