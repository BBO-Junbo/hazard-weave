import type { VercelRequest } from '@vercel/node';

export function parseBboxQuery(value: unknown): [number, number, number, number] {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') throw new Error('bbox is required.');
  const values = raw.split(',').map(Number);
  if (values.length !== 4 || values.some((item) => !Number.isFinite(item))) {
    throw new Error('bbox must be west,south,east,north.');
  }
  const [west, south, east, north] = values;
  if (west >= east || south >= north) throw new Error('bbox is invalid.');
  if (east - west > 8 || north - south > 6) {
    throw new Error('bbox is too large; zoom in before requesting community data.');
  }
  return [west, south, east, north];
}

export function queryString(request: VercelRequest, name: string): string {
  const value = request.query[name];
  return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
}
