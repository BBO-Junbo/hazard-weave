import type { VercelRequest, VercelResponse } from '@vercel/node';

export function allowMethods(
  request: VercelRequest,
  response: VercelResponse,
  methods: string[],
): boolean {
  if (!request.method || !methods.includes(request.method)) {
    response.setHeader('Allow', methods.join(', '));
    response.status(405).json({ error: 'Method not allowed.' });
    return false;
  }
  return true;
}

export function errorResponse(response: VercelResponse, error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : 'Unknown server error.';
  response.status(status).json({ error: message });
}

export function requireAdmin(request: VercelRequest): boolean {
  const expected = process.env.ADMIN_API_KEY;
  const supplied = request.headers['x-admin-key'];
  return Boolean(expected && typeof supplied === 'string' && supplied === expected);
}
