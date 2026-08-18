import { tool } from 'ai';
import { z } from 'zod';
import {
  normalizeFeatureCollection,
  parseUsgsInstantaneous,
  type UsgsInstantaneousPayload,
} from '../../../shared/liveFlood.js';
import { fetchOfficialJson } from '../../flood.js';
import type { EvidenceCollector, ToolRuntimeContext } from './types.js';
import { pointInBounds, requireBounds, text, toNumber } from './utils.js';

const USGS_SERVICE =
  'https://waterservices.usgs.gov/nwis/iv/?format=json&stateCd=tn&parameterCd=00060,00065&siteStatus=active';

function currentIso() {
  return new Date().toISOString();
}

export function createFloodStatusTool(
  context: ToolRuntimeContext,
  collect: EvidenceCollector,
) {
  return tool({
    description:
      'Retrieve current observed flood and hydrologic conditions for the current Tennessee map view using NOAA/NWS river status and USGS stream gauges. Use this for questions about current flooding, river status, gauges, rising water, or present hydrologic conditions. This tool does not claim parcel-level inundation.',
    inputSchema: z.object({}),
    execute: async () => {
      const bounds = requireBounds(context.mapBounds);
      const bbox = bounds.join(',');

      const noaaUrl = new URL(
        'https://mapservices.weather.noaa.gov/eventdriven/rest/services/water/riv_gauges/MapServer/0/query',
      );
      noaaUrl.searchParams.set('where', "state='TN'");
      noaaUrl.searchParams.set('geometry', bbox);
      noaaUrl.searchParams.set('geometryType', 'esriGeometryEnvelope');
      noaaUrl.searchParams.set('inSR', '4326');
      noaaUrl.searchParams.set('outSR', '4326');
      noaaUrl.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
      noaaUrl.searchParams.set(
        'outFields',
        'gaugelid,status,location,waterbody,obstime,observed,units,action,flood,moderate,major,latitude,longitude',
      );
      noaaUrl.searchParams.set('returnGeometry', 'true');
      noaaUrl.searchParams.set('f', 'geojson');

      const [noaaRaw, usgsRaw] = await Promise.all([
        fetchOfficialJson(noaaUrl.toString(), 20_000),
        fetchOfficialJson(USGS_SERVICE, 20_000),
      ]);

      const noaa = normalizeFeatureCollection(noaaRaw);
      const usgsAll = parseUsgsInstantaneous(usgsRaw as UsgsInstantaneousPayload);
      const usgs = usgsAll.features.filter((feature) => pointInBounds(feature, bounds));

      const statusCounts: Record<string, number> = {};
      const elevated = noaa.features
        .map((feature) => {
          const props = feature.properties ?? {};
          const status = text(props.status, 'not_defined');
          statusCounts[status] = (statusCounts[status] ?? 0) + 1;
          return {
            gaugeId: text(props.gaugelid),
            location: text(props.location, text(props.waterbody, 'Unnamed gauge')),
            waterbody: text(props.waterbody),
            status,
            observed: text(props.observed),
            units: text(props.units),
            observedAt: text(props.obstime),
            floodStage: toNumber(props.flood),
            moderateStage: toNumber(props.moderate),
            majorStage: toNumber(props.major),
          };
        })
        .filter((row) => ['action', 'minor', 'moderate', 'major'].includes(row.status))
        .slice(0, 12);

      const recentUsgs = usgs
        .map((feature) => {
          const props = feature.properties ?? {};
          return {
            siteCode: text(props.siteCode),
            name: text(props.name, 'USGS gauge'),
            gageHeightFt: toNumber(props.gageHeightFt),
            dischargeCfs: toNumber(props.dischargeCfs),
            observedAt: text(props.observedAt),
          };
        })
        .sort((a, b) => b.observedAt.localeCompare(a.observedAt))
        .slice(0, 12);

      const summary =
        elevated.length > 0
          ? `${elevated.length} NOAA/NWS gauges in the current map view are at action stage or a flood category; ${noaa.features.length} NOAA gauges and ${usgs.length} USGS gauges are available in the view.`
          : `No NOAA/NWS gauge in the current map view is currently classified at action stage or a flood category. ${noaa.features.length} NOAA gauges and ${usgs.length} USGS gauges are available in the view.`;

      const evidence = {
        tool: 'getFloodStatus' as const,
        summary,
        sources: [
          {
            name: 'NOAA/NWS National Water Prediction Service river gauges',
            validTime: currentIso(),
            modelVersion: 'Observed River Stages',
          },
          {
            name: 'USGS Water Services instantaneous values',
            validTime: currentIso(),
            modelVersion: '00060 discharge + 00065 gage height',
          },
        ],
        mapLayers: ['noaa_observed', 'usgs_gauges'] as const,
        warnings: [
          'Gauge flood categories are location-specific and are not parcel-level inundation maps.',
          'USGS instantaneous values are provisional operational observations and should be interpreted with their timestamps.',
        ],
      };
      collect(evidence);

      return {
        status: 'success',
        scope: { bounds, selectedTime: context.selectedTime ?? 'current' },
        summary,
        noaa: {
          gaugesInView: noaa.features.length,
          statusCounts,
          elevatedGauges: elevated,
        },
        usgs: {
          gaugesInView: usgs.length,
          recentObservations: recentUsgs,
        },
        limitations: evidence.warnings,
      };
    },
  });
}
