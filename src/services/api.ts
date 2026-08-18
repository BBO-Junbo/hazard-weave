import { mockDashboardPayload } from '../../shared/mockDataset';
import { getAiProviderOption } from '../ai/catalog';
import type {
  AiProviderId,
  AssistantResponse,
  ChatRequest,
  DashboardResponse,
  ProviderDescriptor,
} from '../types';

const allowMockFallback = import.meta.env.VITE_ALLOW_MOCK_FALLBACK !== 'false';

const mockProvider: ProviderDescriptor = {
  name: 'mock',
  label: 'Built-in mock fallback',
  mutable: false,
  source: 'Browser bundle',
};

function mockDashboardResponse(): DashboardResponse {
  return {
    ...mockDashboardPayload,
    provider: mockProvider,
    generatedAt: new Date().toISOString(),
  };
}

const mockAssistantResponse: AssistantResponse = {
  answer:
    'North River currently has the highest combined priority. The illustrative analysis indicates overlap between a high flood-probability zone, elevated community vulnerability and a care facility requiring review.',
  confidence: 'Moderate',
  mapActions: [
    { type: 'show_layer', layerId: 'flood' },
    { type: 'show_layer', layerId: 'vulnerability' },
    { type: 'show_layer', layerId: 'facilities' },
    { type: 'fit_bounds', bounds: [-84.08, 35.88, -83.77, 36.09] },
  ],
  rows: mockDashboardPayload.rows.slice(0, 2),
  sources: mockDashboardPayload.sources,
  provider: mockProvider,
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    let detail = '';
    try {
      const payload = (await response.json()) as { error?: string };
      detail = payload.error?.trim() ?? '';
    } catch {
      // Ignore non-JSON error bodies.
    }
    throw new Error(detail || `${url} returned status ${response.status}.`);
  }
  return (await response.json()) as T;
}

export async function getDashboardData(): Promise<DashboardResponse> {
  try {
    return await fetchJson<DashboardResponse>('/api/dashboard');
  } catch (error) {
    if (!allowMockFallback) throw error;
    console.warn('Dashboard API unavailable; using browser mock fallback.', error);
    return mockDashboardResponse();
  }
}

interface AiRequestOptions {
  previewMode: boolean;
  provider: AiProviderId;
  modelId: string;
  apiKey: string;
}

function previewAssistantResponse(
  question: string,
  options: AiRequestOptions,
): AssistantResponse {
  const provider = getAiProviderOption(options.provider);
  const normalized = question.toLowerCase();
  let answer =
    `Frontend preview using ${provider.label}. In live mode, HazardWeave will interpret this question, select approved geospatial/data tools, execute those tools on Vercel, and return an evidence-grounded answer with map actions. No live LLM request was made in this preview.`;

  if (/flood|water|hydrolog|gauge/.test(normalized)) {
    answer =
      `Frontend preview using ${provider.label}. A live request for this question would route to flood and hydrologic tools such as FEMA, USGS, NOAA/NWM, then summarize only the returned evidence. No model API or user key was contacted.`;
  } else if (/vulnerab|socio|community|poverty|income/.test(normalized)) {
    answer =
      `Frontend preview using ${provider.label}. A live request would combine the selected map context with CDC SVI and ACS-derived socioeconomic indicators, then explain the strongest vulnerability signals. No model API or user key was contacted.`;
  } else if (/claim|assistance|resource|help/.test(normalized)) {
    answer =
      `Frontend preview using ${provider.label}. A live request would use available NFIP claims, FEMA assistance and community-resource tools. If help-request data are not connected, HazardWeave will explicitly report that limitation rather than infer unmet need from proxy data.`;
  }

  return {
    answer,
    confidence: 'Moderate',
    mapActions: [],
    rows: [],
    sources: [],
    provider: mockProvider,
  };
}

export async function askHazardQuestion(
  question: string,
  context: ChatRequest['context'],
  options: AiRequestOptions,
): Promise<AssistantResponse> {
  if (options.previewMode) {
    await new Promise((resolve) => window.setTimeout(resolve, 520));
    return previewAssistantResponse(question, options);
  }

  return fetchJson<AssistantResponse>('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      context,
      ai: {
        provider: options.provider,
        modelId: options.modelId,
        apiKey: options.provider === 'hazardweave' ? undefined : options.apiKey,
      },
    } satisfies ChatRequest),
  });
}
