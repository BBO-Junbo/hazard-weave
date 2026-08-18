import type { DashboardPayload } from '../../../shared/contracts.js';
import type { DashboardDataProvider } from '../provider.js';
import { parseDashboardPayload } from '../validate.js';

function dashboardUrl(): URL {
  const baseUrl = process.env.EXTERNAL_DATA_API_URL;
  if (!baseUrl) {
    throw new Error('EXTERNAL_DATA_API_URL is required for the external provider.');
  }

  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const path = process.env.EXTERNAL_DATA_API_DASHBOARD_PATH || 'dashboard';
  return new URL(path.replace(/^\//, ''), base);
}

function headers(): HeadersInit {
  const token = process.env.EXTERNAL_DATA_API_TOKEN;
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function createExternalProvider(): DashboardDataProvider {
  const url = dashboardUrl();
  const writeEnabled = process.env.EXTERNAL_DATA_API_WRITE_ENABLED === 'true';

  return {
    descriptor: {
      name: 'external',
      label: 'External REST API',
      mutable: writeEnabled,
      source: url.origin,
    },
    async read() {
      const response = await fetch(url, {
        headers: headers(),
        signal: AbortSignal.timeout(12_000),
      });

      if (!response.ok) {
        throw new Error(`External data API returned ${response.status}.`);
      }

      return parseDashboardPayload(await response.json());
    },
    async write(payload: DashboardPayload) {
      if (!writeEnabled) {
        throw new Error('External writes are disabled. Set EXTERNAL_DATA_API_WRITE_ENABLED=true.');
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          ...headers(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(12_000),
      });

      if (!response.ok) {
        throw new Error(`External data API write returned ${response.status}.`);
      }
    },
    async health() {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: headers(),
          signal: AbortSignal.timeout(8_000),
        });
        return {
          ok: response.ok,
          provider: 'external',
          message: `External API returned ${response.status}.`,
        };
      } catch (error) {
        return {
          ok: false,
          provider: 'external',
          message: error instanceof Error ? error.message : 'External API health check failed.',
        };
      }
    },
  };
}
