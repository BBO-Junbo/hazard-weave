export interface LooseGeometry {
  type: string;
  coordinates?: unknown;
  [key: string]: unknown;
}

export interface LooseFeature {
  type: 'Feature';
  geometry: LooseGeometry | null;
  properties: Record<string, unknown> | null;
}

export interface LooseFeatureCollection {
  type: 'FeatureCollection';
  features: LooseFeature[];
}

export interface UsgsInstantaneousPayload {
  value?: {
    timeSeries?: Array<Record<string, unknown>>;
  };
}


export function emptyFeatureCollection(): LooseFeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}

function numberOrNull(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringOrEmpty(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function firstArrayItem(value: unknown): Record<string, unknown> | undefined {
  return Array.isArray(value) && value[0] && typeof value[0] === 'object'
    ? (value[0] as Record<string, unknown>)
    : undefined;
}

function latestValueFromSeries(series: Record<string, unknown>): {
  value: number | null;
  dateTime: string;
} {
  const values = Array.isArray(series.values) ? series.values : [];
  let latest: { value: number | null; dateTime: string } = {
    value: null,
    dateTime: '',
  };

  values.forEach((bucket) => {
    if (!bucket || typeof bucket !== 'object') return;
    const rows = Array.isArray((bucket as Record<string, unknown>).value)
      ? ((bucket as Record<string, unknown>).value as Array<Record<string, unknown>>)
      : [];

    rows.forEach((row) => {
      const currentDate = stringOrEmpty(row.dateTime);
      if (!currentDate) return;
      if (!latest.dateTime || currentDate > latest.dateTime) {
        latest = {
          value: numberOrNull(row.value),
          dateTime: currentDate,
        };
      }
    });
  });

  return latest;
}

/**
 * Converts the USGS Water Services instantaneous-values response into one
 * point per monitoring site, combining gage-height (00065) and discharge
 * (00060) observations when both are available.
 */
export function parseUsgsInstantaneous(
  payload: UsgsInstantaneousPayload,
): LooseFeatureCollection {
  const series = Array.isArray(payload?.value?.timeSeries)
    ? payload.value?.timeSeries ?? []
    : [];

  const sites = new Map<
    string,
    {
      latitude: number;
      longitude: number;
      name: string;
      siteCode: string;
      gageHeightFt: number | null;
      dischargeCfs: number | null;
      observedAt: string;
    }
  >();

  series.forEach((rawSeries) => {
    const sourceInfo =
      rawSeries.sourceInfo && typeof rawSeries.sourceInfo === 'object'
        ? (rawSeries.sourceInfo as Record<string, unknown>)
        : {};
    const geoLocation =
      sourceInfo.geoLocation && typeof sourceInfo.geoLocation === 'object'
        ? (sourceInfo.geoLocation as Record<string, unknown>)
        : {};
    const geogLocation =
      geoLocation.geogLocation && typeof geoLocation.geogLocation === 'object'
        ? (geoLocation.geogLocation as Record<string, unknown>)
        : {};
    const siteCodeItem = firstArrayItem(sourceInfo.siteCode);
    const variable =
      rawSeries.variable && typeof rawSeries.variable === 'object'
        ? (rawSeries.variable as Record<string, unknown>)
        : {};
    const variableCodeItem = firstArrayItem(variable.variableCode);

    const latitude = numberOrNull(geogLocation.latitude);
    const longitude = numberOrNull(geogLocation.longitude);
    const siteCode = stringOrEmpty(siteCodeItem?.value);
    const variableCode = stringOrEmpty(variableCodeItem?.value);
    if (latitude === null || longitude === null || !siteCode) return;

    const latest = latestValueFromSeries(rawSeries);
    const current = sites.get(siteCode) ?? {
      latitude,
      longitude,
      siteCode,
      name: stringOrEmpty(sourceInfo.siteName) || `USGS ${siteCode}`,
      gageHeightFt: null,
      dischargeCfs: null,
      observedAt: '',
    };

    if (variableCode === '00065') current.gageHeightFt = latest.value;
    if (variableCode === '00060') current.dischargeCfs = latest.value;
    if (latest.dateTime > current.observedAt) current.observedAt = latest.dateTime;
    sites.set(siteCode, current);
  });

  return {
    type: 'FeatureCollection',
    features: [...sites.values()].map((site) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [site.longitude, site.latitude],
      },
      properties: {
        type: 'USGS stream gauge',
        source: 'USGS Water Services',
        siteCode: site.siteCode,
        name: site.name,
        gageHeightFt: site.gageHeightFt,
        dischargeCfs: site.dischargeCfs,
        observedAt: site.observedAt,
      },
    })),
  };
}

export function normalizeFeatureCollection(value: unknown): LooseFeatureCollection {
  if (!value || typeof value !== 'object') return emptyFeatureCollection();
  const candidate = value as Record<string, unknown>;
  if (candidate.type !== 'FeatureCollection' || !Array.isArray(candidate.features)) {
    return emptyFeatureCollection();
  }

  return {
    type: 'FeatureCollection',
    features: candidate.features.filter(
      (feature): feature is LooseFeature =>
        Boolean(
          feature &&
            typeof feature === 'object' &&
            (feature as Record<string, unknown>).type === 'Feature',
        ),
    ),
  };
}

