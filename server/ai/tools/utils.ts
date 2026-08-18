import type { LooseFeature, LooseFeatureCollection } from '../../../shared/liveFlood.js';

export function requireBounds(
  bounds: [number, number, number, number] | undefined,
): [number, number, number, number] {
  if (!bounds) {
    throw new Error('The map extent is unavailable. Move or reload the map and try again.');
  }
  const [west, south, east, north] = bounds;
  if (![west, south, east, north].every(Number.isFinite) || west >= east || south >= north) {
    throw new Error('The current map extent is invalid.');
  }
  if (east - west > 6 || north - south > 5) {
    throw new Error('The current map view is too broad for a grounded local analysis. Zoom in and try again.');
  }
  return bounds;
}

export function pointInBounds(
  feature: LooseFeature,
  bounds: [number, number, number, number],
): boolean {
  if (feature.geometry?.type !== 'Point' || !Array.isArray(feature.geometry.coordinates)) return false;
  const [longitude, latitude] = feature.geometry.coordinates as unknown[];
  const x = Number(longitude);
  const y = Number(latitude);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const [west, south, east, north] = bounds;
  return x >= west && x <= east && y >= south && y <= north;
}

export function toNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function text(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  const result = String(value).trim();
  return result || fallback;
}

export function round(value: number | null, digits = 2): number | null {
  if (value === null) return null;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

export function sumProperties(
  collection: LooseFeatureCollection,
  property: string,
): number {
  return collection.features.reduce((sum, feature) => {
    const value = toNumber(feature.properties?.[property]);
    return sum + (value ?? 0);
  }, 0);
}

export function uniqueSources(names: string[]): string[] {
  return [...new Set(names.filter(Boolean))];
}
