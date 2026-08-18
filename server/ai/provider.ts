import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { ChatModelSelection } from '../../shared/contracts.js';

function required(value: string | undefined, message: string): string {
  const clean = value?.trim();
  if (!clean) throw new Error(message);
  return clean;
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

export function resolveModel(selection: ChatModelSelection | undefined) {
  const provider = selection?.provider ?? 'hazardweave';

  if (provider === 'hazardweave') {
    const baseURL = normalizeBaseUrl(
      required(
        process.env.HAZARDWEAVE_LLM_URL,
        'HazardWeave Lite is not configured yet. Set HAZARDWEAVE_LLM_URL on Vercel.',
      ),
    );
    const modelId = process.env.HAZARDWEAVE_LLM_MODEL?.trim() || 'hazardweave-lite';
    const token = process.env.HAZARDWEAVE_LLM_TOKEN?.trim();

    const hosted = createOpenAICompatible({
      name: 'hazardweave',
      baseURL,
      ...(token ? { apiKey: token } : {}),
    });

    return {
      model: hosted(modelId),
      provider,
      modelId,
      label: 'HazardWeave Lite',
    };
  }

  const apiKey = required(
    selection?.apiKey,
    `An API key is required for ${provider}. The key is used for this request only.`,
  );
  const modelId = required(selection?.modelId, `A model ID is required for ${provider}.`);

  if (provider === 'openai') {
    const openai = createOpenAI({ apiKey });
    return { model: openai(modelId), provider, modelId, label: 'OpenAI' };
  }

  if (provider === 'anthropic') {
    const anthropic = createAnthropic({ apiKey });
    return { model: anthropic(modelId), provider, modelId, label: 'Anthropic Claude' };
  }

  if (provider === 'google') {
    const google = createGoogleGenerativeAI({ apiKey });
    return { model: google(modelId), provider, modelId, label: 'Google Gemini' };
  }

  throw new Error('Unsupported AI provider.');
}
