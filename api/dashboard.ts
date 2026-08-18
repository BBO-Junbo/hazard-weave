import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { DashboardResponse } from '../shared/contracts.js';
import { getDataProvider } from '../server/data/index.js';
import { allowMethods, errorResponse } from '../server/http.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (!allowMethods(request, response, ['GET'])) return;

  try {
    const provider = await getDataProvider();
    const payload = await provider.read();
    const result: DashboardResponse = {
      ...payload,
      provider: provider.descriptor,
      generatedAt: new Date().toISOString(),
    };

    response.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
    response.status(200).json(result);
  } catch (error) {
    errorResponse(response, error);
  }
}
