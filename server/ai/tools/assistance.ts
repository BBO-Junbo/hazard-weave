import { tool } from 'ai';
import { z } from 'zod';
import { loadFemaIhpDirect, loadNfipDirect } from '../../../shared/publicData';
import type { EvidenceCollector, ToolRuntimeContext } from './types';
import { requireBounds, sumProperties } from './utils';

function currentIso() {
  return new Date().toISOString();
}

export function createAssistanceSummaryTool(
  context: ToolRuntimeContext,
  collect: EvidenceCollector,
) {
  return tool({
    description:
      'Retrieve historical/administrative flood insurance claims and FEMA Individual Assistance summaries for the current Tennessee map view. Use this for questions about NFIP claims, FEMA assistance, registrations, awards, recovery assistance, or what assistance data are available. Do not use this tool as a proxy for current unmet need.',
    inputSchema: z.object({}),
    execute: async () => {
      const bounds = requireBounds(context.mapBounds);
      const [claims, ihp] = await Promise.all([
        loadNfipDirect(bounds, 'claims'),
        loadFemaIhpDirect(bounds),
      ]);

      const claimRecords = sumProperties(claims, 'recordCount');
      const claimPayments = sumProperties(claims, 'totalAmount');
      const registrations = sumProperties(ihp, 'registrations');
      const ihpAmount = sumProperties(ihp, 'ihpAmount');
      const housingAmount = sumProperties(ihp, 'haAmount');
      const otherNeedsAmount = sumProperties(ihp, 'onaAmount');
      const truncated = claims.features.some((feature) => Boolean(feature.properties?.truncated)) ||
        ihp.features.some((feature) => Boolean(feature.properties?.truncated));

      const summary = `${Math.round(claimRecords).toLocaleString()} NFIP claim records are represented in approximate-location clusters in the current map view, with about $${Math.round(claimPayments).toLocaleString()} in recorded claim payments. FEMA RI-IHP summaries show ${Math.round(registrations).toLocaleString()} valid registrations and about $${Math.round(ihpAmount).toLocaleString()} in IHP awards across intersecting ZIP areas.`;

      const warnings = [
        'NFIP locations are approximate/redacted and must not be interpreted as exact insured-property locations.',
        'FEMA assistance and NFIP claims are historical/administrative records, not real-time unmet-need observations.',
        ...(truncated ? ['One or more upstream datasets reached the dashboard page limit; totals may be incomplete.'] : []),
      ];

      const evidence = {
        tool: 'getAssistanceSummary' as const,
        summary,
        sources: [
          {
            name: 'OpenFEMA NFIP Redacted Claims v3',
            validTime: currentIso(),
            modelVersion: 'Approximate-location clusters',
          },
          {
            name: 'OpenFEMA Registration Intake and Individuals Household Program (RI-IHP) v2',
            validTime: currentIso(),
            modelVersion: 'ZIP/ZCTA summaries',
          },
        ],
        mapLayers: ['nfip_claims', 'fema_ihp'] as const,
        warnings,
      };
      collect(evidence);

      return {
        status: 'success',
        scope: { bounds },
        summary,
        nfipClaims: {
          approximateClusters: claims.features.length,
          claimRecords: Math.round(claimRecords),
          claimPaymentsUsd: Math.round(claimPayments),
        },
        femaIndividualAssistance: {
          zipAreas: ihp.features.length,
          validRegistrations: Math.round(registrations),
          ihpAwardsUsd: Math.round(ihpAmount),
          housingAssistanceUsd: Math.round(housingAmount),
          otherNeedsAssistanceUsd: Math.round(otherNeedsAmount),
        },
        limitations: warnings,
      };
    },
  });
}
