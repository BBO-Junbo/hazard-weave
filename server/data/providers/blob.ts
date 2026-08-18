import { get, put } from '@vercel/blob';
import type { DashboardPayload } from '../../../shared/contracts.js';
import type { DashboardDataProvider } from '../provider.js';
import { parseDashboardPayload } from '../validate.js';

function blobPath(): string {
  return process.env.BLOB_DATA_PATHNAME || 'hazardweave/dashboard-data.json';
}

function blobAccess(): 'private' | 'public' {
  return process.env.BLOB_ACCESS === 'public' ? 'public' : 'private';
}

export function createBlobProvider(): DashboardDataProvider {
  const pathname = blobPath();
  const access = blobAccess();

  return {
    descriptor: {
      name: 'blob',
      label: 'Vercel Blob JSON',
      mutable: true,
      source: `${access} blob: ${pathname}`,
    },
    async read() {
      const result = await get(pathname, { access });
      if (!result || result.statusCode !== 200 || !result.stream) {
        throw new Error(`Blob dataset not found at ${pathname}.`);
      }

      const json = await new Response(result.stream).json();
      return parseDashboardPayload(json);
    },
    async write(payload: DashboardPayload) {
      await put(pathname, JSON.stringify(payload, null, 2), {
        access,
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
      });
    },
    async health() {
      try {
        const result = await get(pathname, { access });
        return {
          ok: Boolean(result && result.statusCode === 200),
          provider: 'blob',
          message: result ? `Blob dataset is reachable at ${pathname}.` : 'Blob dataset was not found.',
        };
      } catch (error) {
        return {
          ok: false,
          provider: 'blob',
          message: error instanceof Error ? error.message : 'Blob health check failed.',
        };
      }
    },
  };
}
