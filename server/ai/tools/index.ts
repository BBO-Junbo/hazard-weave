import type { ChatRequest } from '../../../shared/contracts';
import { createAssistanceSummaryTool } from './assistance';
import { createFloodStatusTool } from './flood';
import type { ToolEvidence } from './types';
import { createCommunityVulnerabilityTool } from './vulnerability';

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
