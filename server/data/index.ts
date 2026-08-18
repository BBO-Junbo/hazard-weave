import type { DataProviderName } from '../../shared/contracts';
import type { DashboardDataProvider } from './provider';

function selectedProvider(): DataProviderName {
  const configured = process.env.DATA_PROVIDER?.toLowerCase();

  if (configured && configured !== 'auto') {
    if (['mock', 'blob', 'external', 'postgres'].includes(configured)) {
      return configured as DataProviderName;
    }
    throw new Error(`Unsupported DATA_PROVIDER '${configured}'.`);
  }

  if (process.env.DATABASE_URL) return 'postgres';
  if (process.env.EXTERNAL_DATA_API_URL) return 'external';
  if (process.env.BLOB_READ_WRITE_TOKEN) return 'blob';
  return 'mock';
}

export async function getDataProvider(): Promise<DashboardDataProvider> {
  switch (selectedProvider()) {
    case 'blob': {
      const { createBlobProvider } = await import('./providers/blob');
      return createBlobProvider();
    }
    case 'external': {
      const { createExternalProvider } = await import('./providers/external');
      return createExternalProvider();
    }
    case 'postgres': {
      const { createPostgresProvider } = await import('./providers/postgres');
      return createPostgresProvider();
    }
    case 'mock':
    default: {
      const { createMockProvider } = await import('./providers/mock');
      return createMockProvider();
    }
  }
}
