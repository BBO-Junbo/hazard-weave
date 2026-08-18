import type { ChatRequest } from '../../../shared/contracts.js';
import { createAssistanceSummaryTool } from './assistance.js';
import { createFloodStatusTool } from './flood.js';
import type { ToolEvidence } from './types.js';
import { createCommunityVulnerabilityTool } from './vulnerability.js';

export function createHazardWeaveTools(context: ChatRequest['context']) {
  const evidence: ToolEvidence[] = [];
  const collect = (item: ToolEvidence) => evidence.push(item);
  const runtime = {
    mapBounds: context?.mapBounds,
    mapZoom: context?.mapZoom,
    selectedTime: context?.selectedTime,
    selectedCounty: context?.selectedCounty,
  };

  return {
    evidence,
    tools: {
      getFloodStatus: createFloodStatusTool(runtime, collect),
      getCommunityVulnerability: createCommunityVulnerabilityTool(runtime, collect),
      getAssistanceSummary: createAssistanceSummaryTool(runtime, collect),
    },
  };
}
