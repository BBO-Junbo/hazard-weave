import type { AiProviderConfig, AiProviderId } from '../types';

export interface AiProviderOption {
  id: AiProviderId;
  label: string;
  shortLabel: string;
  description: string;
  mode: 'hosted' | 'byok';
  badge: string;
  defaultModel: string;
  modelPlaceholder: string;
  defaultBaseUrl?: string;
}

export const aiProviderOptions: AiProviderOption[] = [
  {
    id: 'hazardweave',
    label: 'HazardWeave Lite',
    shortLabel: 'HazardWeave Lite',
    description: 'Free small model hosted on the HazardWeave research server.',
    mode: 'hosted',
    badge: 'Free',
    defaultModel: 'hazardweave-lite',
    modelPlaceholder: 'Managed by HazardWeave',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    shortLabel: 'OpenAI',
    description: 'Use your own OpenAI API key. The key is intended for the current session only.',
    mode: 'byok',
    badge: 'BYOK',
    defaultModel: '',
    modelPlaceholder: 'Enter an OpenAI model ID',
    defaultBaseUrl: 'https://api.openai.com/v1',
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    shortLabel: 'Claude',
    description: 'Use your own Anthropic API key for Claude models.',
    mode: 'byok',
    badge: 'BYOK',
    defaultModel: '',
    modelPlaceholder: 'Enter a Claude model ID',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
  },
  {
    id: 'google',
    label: 'Google Gemini',
    shortLabel: 'Gemini',
    description: 'Use your own Google AI API key for Gemini models.',
    mode: 'byok',
    badge: 'BYOK',
    defaultModel: '',
    modelPlaceholder: 'Enter a Gemini model ID',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  },
];

export const initialAiProviderConfig: AiProviderConfig = {
  provider: 'hazardweave',
  modelId: 'hazardweave-lite',
  apiKey: '',
  baseUrl: '',
};

export function getAiProviderOption(id: AiProviderId) {
  return aiProviderOptions.find((provider) => provider.id === id) ?? aiProviderOptions[0];
}
