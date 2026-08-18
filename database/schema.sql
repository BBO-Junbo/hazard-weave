CREATE TABLE IF NOT EXISTS hazardweave_datasets (
  dataset_key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional later extension for real spatial analysis:
-- CREATE EXTENSION IF NOT EXISTS postgis;
-- Structured facilities, incidents and communities can then be moved from the
-- JSON payload into normal PostGIS tables without changing the frontend API.
