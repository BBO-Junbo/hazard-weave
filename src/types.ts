export type BasemapId = 'dark' | 'tdot' | 'naip';

export type AiProviderId = 'hazardweave' | 'openai' | 'anthropic' | 'google';

export interface AiProviderConfig {
  provider: AiProviderId;
  modelId: string;
  /**
   * Browser-memory-only in the frontend preview. Do not persist this value to
   * localStorage, source control, analytics, or logs.
   */
  apiKey: string;
}

export type {
  AssistantResponse,
  ChatMessage,
  ChatRequest,
  DashboardMapData,
  DashboardPayload,
  DashboardResponse,
  DataProviderName,
  LayerId,
  LayerState,
  MapAction,
  ProviderDescriptor,
  ResultRow,
  SourceReference,
} from '../shared/contracts';
