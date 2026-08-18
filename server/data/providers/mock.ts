import { mockDashboardPayload } from '../../../shared/mockDataset.js';
import type { DashboardPayload } from '../../../shared/contracts.js';
import type { DashboardDataProvider } from '../provider.js';

function clonePayload(): DashboardPayload {
  return JSON.parse(JSON.stringify(mockDashboardPayload)) as DashboardPayload;
}

export function createMockProvider(): DashboardDataProvider {
  return {
    descriptor: {
      name: 'mock',
      label: 'Built-in mock dataset',
      mutable: false,
      source: 'Repository source code',
    },
    async read() {
      return clonePayload();
    },
    async health() {
      return {
        ok: true,
        provider: 'mock',
        message: 'Built-in mock dataset is available.',
      };
    },
  };
}
