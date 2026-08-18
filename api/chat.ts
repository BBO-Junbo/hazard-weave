import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateText, stepCountIs } from 'ai';
import type {
  AssistantResponse,
  ChatRequest,
  MapAction,
  RemoteMapLayerId,
  SourceReference,
} from '../shared/contracts';
import { buildSystemPrompt } from '../server/ai/prompt';
import { resolveModel } from '../server/ai/provider';
import { createHazardWeaveTools } from '../server/ai/tools';
import { allowMethods } from '../server/http';

function parseBody(body: unknown): ChatRequest {
  const value = typeof body === 'string' ? JSON.parse(body) : body;
  if (!value || typeof value !== 'object' || !('question' in value)) {
    throw new Error('A question is required.');
  }

  const request = value as ChatRequest;
  if (!request.question?.trim()) throw new Error('A non-empty question is required.');
  if (request.question.length > 4000) throw new Error('The question is too long.');
  return request;
}

function dedupeSources(sources: SourceReference[]): SourceReference[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = `${source.name}|${source.validTime}|${source.modelVersion ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function safeMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : 'Unknown AI request error.';
  return raw
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/AIza[A-Za-z0-9_-]+/g, '[redacted]')
    .slice(0, 800);
}

function looksDataDependent(question: string): boolean {
  return /current|now|here|this area|flood|water|gauge|vulnerab|socio|poverty|income|claim|assistance|resource|need|community|risk|expos/i.test(
    question,
  );
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (!allowMethods(request, response, ['POST'])) return;

  try {
    const body = parseBody(request.body);
    const resolved = resolveModel(body.ai);
    const runtime = createHazardWeaveTools(body.context);

    const result = await generateText({
      model: resolved.model,
      system: buildSystemPrompt(body.context),
      prompt: body.question.trim(),
      tools: runtime.tools,
      stopWhen: stepCountIs(5),
      maxOutputTokens: 900,
    });

    const evidence = runtime.evidence;
    const grounded = evidence.length > 0;
    const sources = dedupeSources(evidence.flatMap((item) => item.sources));
    const mapLayerIds = [...new Set(evidence.flatMap((item) => item.mapLayers))] as RemoteMapLayerId[];
    const mapActions: MapAction[] = mapLayerIds.map((layerId) => ({
      type: 'show_layer',
      layerId,
    }));

    if (body.context?.mapBounds && mapLayerIds.length > 0) {
      mapActions.push({ type: 'fit_bounds', bounds: body.context.mapBounds });
    }

    let answer = result.text.trim();
    if (looksDataDependent(body.question) && !grounded) {
      answer =
        'I could not ground this request in a HazardWeave data tool, so I will not infer an operational answer. Try asking about current flood conditions, community vulnerability, or FEMA/NFIP assistance in the current map view.';
    } else if (!answer && evidence.length > 0) {
      answer = evidence.map((item) => item.summary).join(' ');
    } else if (!answer) {
      answer = 'The selected model returned no answer.';
    }

    const warnings = evidence.flatMap((item) => item.warnings ?? []);
    const confidence: AssistantResponse['confidence'] = grounded
      ? warnings.length > 0
        ? 'Moderate'
        : 'High'
      : 'Low';

    const payload: AssistantResponse = {
      answer,
      confidence,
      mapActions,
      rows: [],
      sources,
      model: {
        provider: resolved.provider,
        modelId: resolved.modelId,
        label: resolved.label,
      },
    };

    response.setHeader('Cache-Control', 'no-store');
    response.status(200).json(payload);
  } catch (error) {
    const message = safeMessage(error);
    const isInputError = /required|question|model id|api key|map extent|unsupported ai provider/i.test(message);
    response.status(isInputError ? 400 : 502).json({ error: message });
  }
}
