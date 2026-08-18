import postgres from 'postgres';
import type { DashboardPayload } from '../../../shared/contracts.js';
import type { DashboardDataProvider } from '../provider.js';
import { parseDashboardPayload } from '../validate.js';

const datasetKey = process.env.POSTGRES_DATASET_KEY || 'default';
let client: ReturnType<typeof postgres> | undefined;

function sqlClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for the postgres provider.');
  }

  client ??= postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    ssl: databaseUrl.includes('localhost') ? false : 'require',
  });

  return client;
}

export function createPostgresProvider(): DashboardDataProvider {
  return {
    descriptor: {
      name: 'postgres',
      label: 'Connected Postgres',
      mutable: true,
      source: `hazardweave_datasets/${datasetKey}`,
    },
    async read() {
      const sql = sqlClient();
      const rows = await sql<Array<{ payload: unknown }>>`
        SELECT payload
        FROM hazardweave_datasets
        WHERE dataset_key = ${datasetKey}
        LIMIT 1
      `;

      if (!rows[0]) {
        throw new Error(`Postgres dataset '${datasetKey}' was not found.`);
      }

      return parseDashboardPayload(rows[0].payload);
    },
    async write(payload: DashboardPayload) {
      const sql = sqlClient();
      await sql`
        CREATE TABLE IF NOT EXISTS hazardweave_datasets (
          dataset_key TEXT PRIMARY KEY,
          payload JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      const serialised = JSON.stringify(payload);
      await sql`
        INSERT INTO hazardweave_datasets (dataset_key, payload, updated_at)
        VALUES (${datasetKey}, ${serialised}::jsonb, NOW())
        ON CONFLICT (dataset_key)
        DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
      `;
    },
    async health() {
      try {
        const sql = sqlClient();
        await sql`SELECT 1 AS ok`;
        return {
          ok: true,
          provider: 'postgres',
          message: 'Postgres connection is healthy.',
        };
      } catch (error) {
        return {
          ok: false,
          provider: 'postgres',
          message: error instanceof Error ? error.message : 'Postgres health check failed.',
        };
      }
    },
  };
}
