import type { DashboardPayload } from '../../shared/contracts.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFeatureCollection(value: unknown): boolean {
  return isRecord(value) && value.type === 'FeatureCollection' && Array.isArray(value.features);
}

export function parseDashboardPayload(value: unknown): DashboardPayload {
  const candidate = isRecord(value) && isRecord(value.data) ? value.data : value;

  if (!isRecord(candidate)) {
    throw new Error('Dashboard payload must be a JSON object.');
  }

  if (!Array.isArray(candidate.layers) || !Array.isArray(candidate.rows)) {
    throw new Error('Dashboard payload must contain layers and rows arrays.');
  }

  if (!isRecord(candidate.map)) {
    throw new Error('Dashboard payload must contain a map object.');
  }

  const map = candidate.map;
  const validMap =
    isFeatureCollection(map.floodZones) &&
    isFeatureCollection(map.vulnerabilityAreas) &&
    isFeatureCollection(map.facilities) &&
    isFeatureCollection(map.incidents);

  if (!validMap) {
    throw new Error('Dashboard map layers must be valid GeoJSON FeatureCollections.');
  }

  if (!Array.isArray(candidate.sources) || !isRecord(candidate.incident)) {
    throw new Error('Dashboard payload must contain sources and incident metadata.');
  }

  return candidate as unknown as DashboardPayload;
}
