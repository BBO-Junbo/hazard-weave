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

const PRIVATE_HOST =
  /^(localhost|.*\.localhost|.*\.local|.*\.internal|0\.0\.0\.0|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|\[.*\])$/i;

/**
 * Validates a user-supplied BYOK endpoint. The server fetches this URL, so only
 * public https hosts are allowed to avoid reaching internal services (SSRF).
 */
function userBaseUrl(value: string | undefined): string | undefined {
  const clean = value?.trim();
  if (!clean) return undefined;

  let url: URL;
  try {
    url = new URL(clean);
  } catch {
    throw new Error('Base URL is not a valid URL.');
  }
  if (url.protocol !== 'https:') throw new Error('Base URL must use https.');
  if (url.username || url.password) throw new Error('Base URL must not contain credentials.');
  if (PRIVATE_HOST.test(url.hostname)) throw new Error('Base URL must be a public host.');

  return normalizeBaseUrl(`${url.origin}${url.pathname}`);
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
  const baseURL = userBaseUrl(selection?.baseUrl);
  const endpoint = baseURL ? { baseURL } : {};

  if (provider === 'openai') {
    const openai = createOpenAI({ apiKey, ...endpoint });
    // Proxies and OpenAI-compatible services generally only implement Chat Completions,
    // not the Responses API that openai(modelId) uses by default.
    const model = baseURL ? openai.chat(modelId) : openai(modelId);
    return { model, provider, modelId, label: 'OpenAI' };
  }

  if (provider === 'anthropic') {
    const anthropic = createAnthropic({ apiKey, ...endpoint });
    return { model: anthropic(modelId), provider, modelId, label: 'Anthropic Claude' };
  }

  if (provider === 'google') {
    const google = createGoogleGenerativeAI({ apiKey, ...endpoint });
    return { model: google(modelId), provider, modelId, label: 'Google Gemini' };
  }

  throw new Error('Unsupported AI provider.');
}
