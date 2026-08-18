import type { RemoteMapLayerId, SourceReference } from '../../../shared/contracts';

export interface ToolEvidence {
  tool: 'getFloodStatus' | 'getCommunityVulnerability' | 'getAssistanceSummary';
  summary: string;
  sources: SourceReference[];
  mapLayers: readonly RemoteMapLayerId[];
  warnings?: string[];
}

export interface ToolRuntimeContext {
  mapBounds?: [number, number, number, number];
  mapZoom?: number;
  selectedTime?: string;
  selectedCounty?: string;
}

export type EvidenceCollector = (evidence: ToolEvidence) => void;
