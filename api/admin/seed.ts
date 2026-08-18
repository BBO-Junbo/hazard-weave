import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mockDashboardPayload } from '../../shared/mockDataset.js';
import { getDataProvider } from '../../server/data/index.js';
import { allowMethods, errorResponse, requireAdmin } from '../../server/http.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (!allowMethods(request, response, ['POST'])) return;

  if (!requireAdmin(request)) {
    response.status(401).json({ error: 'Invalid or missing x-admin-key.' });
    return;
  }

  try {
    const provider = await getDataProvider();
    if (!provider.write) {
      response.status(409).json({
        error: `Provider '${provider.descriptor.name}' does not support writes.`,
      });
      return;
    }

    await provider.write(mockDashboardPayload);
    response.status(200).json({
      ok: true,
      provider: provider.descriptor,
      message: 'The demo dataset has been written to the active provider.',
    });
  } catch (error) {
    errorResponse(response, error);
  }
}
