import type { AiProviderId } from '../shared/contracts';

export type BasemapId = 'dark' | 'tdot' | 'naip';

export interface AiProviderConfig {
  provider: AiProviderId;
  modelId: string;
  /**
   * Held in React memory only. Do not persist this value to localStorage,
   * source control, analytics, or logs.
   */
  apiKey: string;
}

export type {
  AiProviderId,
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
  RemoteMapLayerId,
  ResultRow,
  SourceReference,
} from '../shared/contracts';
