import { mockDashboardPayload } from '../../../shared/mockDataset';
import type { DashboardPayload } from '../../../shared/contracts';
import type { DashboardDataProvider } from '../provider';

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
