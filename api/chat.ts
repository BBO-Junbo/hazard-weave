import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { AssistantResponse, ChatRequest, LayerId } from '../shared/contracts';
import { getDataProvider } from '../server/data';
import { allowMethods, errorResponse } from '../server/http';

function parseBody(body: unknown): ChatRequest {
  const value = typeof body === 'string' ? JSON.parse(body) : body;
  if (!value || typeof value !== 'object' || !('question' in value)) {
    throw new Error('A question is required.');
  }

  const request = value as ChatRequest;
  if (!request.question?.trim()) {
    throw new Error('A non-empty question is required.');
  }
  return request;
}

function chooseLayers(question: string): LayerId[] {
  const lower = question.toLowerCase();
  const layers = new Set<LayerId>(['flood']);
  if (/vulnerab|community|population|priority/.test(lower)) layers.add('vulnerability');
  if (/facilit|hospital|shelter|care|nursing/.test(lower)) layers.add('facilities');
  if (/road|incident|report|debris|access/.test(lower)) layers.add('incidents');
  return [...layers];
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (!allowMethods(request, response, ['POST'])) return;

  try {
    const body = parseBody(request.body);
    const provider = await getDataProvider();
    const payload = await provider.read();
    const topRows = [...payload.rows]
      .sort((a, b) => b.exposedPopulation - a.exposedPopulation)
      .slice(0, 3);
    const visibleLayers = chooseLayers(body.question);
    const leading = topRows[0];

    const result: AssistantResponse = {
      answer: leading
        ? `${leading.name} is the first area to review in the current dataset. Its primary concern is ${leading.primaryReason.toLowerCase()}. The result is generated from the active ${provider.descriptor.label.toLowerCase()} provider and should be verified before operational use.`
        : 'The active data provider returned no ranked communities.',
      confidence: 'Moderate',
      mapActions: [
        ...visibleLayers.map((layerId) => ({ type: 'show_layer' as const, layerId })),
        { type: 'fit_bounds', bounds: [-84.08, 35.88, -83.77, 36.09] },
      ],
      rows: topRows,
      sources: payload.sources,
      provider: provider.descriptor,
    };

    response.status(200).json(result);
  } catch (error) {
    errorResponse(response, error, error instanceof SyntaxError ? 400 : 500);
  }
}
