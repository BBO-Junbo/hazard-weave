import {
  emptyFeatureCollection,
  normalizeFeatureCollection,
  type LooseFeature,
  type LooseFeatureCollection,
} from './liveFlood.js';

export type Bounds = [number, number, number, number];

const SVI_TRACT_QUERY =
  'https://services3.arcgis.com/ZvidGQkLaDJxRSJ2/arcgis/rest/services/' +
  'CDC_ATSDR_Social_Vulnerability_Index_2022_USA/FeatureServer/2/query';

const TIGER_ZCTA =
  'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/' +
  'PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1/query';

const OPEN_FEMA = 'https://www.fema.gov/api/open';

function toNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

function clampBounds(bounds: Bounds): Bounds {
  const [west, south, east, north] = bounds;
  return [
    Math.max(-90.5, Math.min(-80, west)),
    Math.max(34, Math.min(37.5, south)),
    Math.max(-90.5, Math.min(-80, east)),
    Math.max(34, Math.min(37.5, north)),
  ];
}

async function fetchJson(url: string, init?: RequestInit, timeoutMs = 20_000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function loadCdcSviDirect(bounds: Bounds): Promise<LooseFeatureCollection> {
  const bbox = clampBounds(bounds).join(',');
  const url = new URL(SVI_TRACT_QUERY);
  url.searchParams.set('where', "ST='47'");
  url.searchParams.set('geometry', bbox);
  url.searchParams.set('geometryType', 'esriGeometryEnvelope');
  url.searchParams.set('inSR', '4326');
  url.searchParams.set('outSR', '4326');
  url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
  url.searchParams.set('outFields', '*');
  url.searchParams.set('returnGeometry', 'true');
  url.searchParams.set('resultRecordCount', '2000');
  url.searchParams.set('f', 'geojson');
  return normalizeFeatureCollection(await fetchJson(url.toString()));
}

export async function loadAcsSocioeconomicDirect(bounds: Bounds): Promise<LooseFeatureCollection> {
  // The Census Data API began requiring an API key for every query in 2026.
  // To keep the public dashboard usable without exposing a key in the browser,
  // this layer uses the ACS-derived socioeconomic fields that CDC/ATSDR
  // publishes in its 2022 SVI tract FeatureServer. Those fields are based on
  // the 2018–2022 ACS 5-year estimates.
  const bbox = clampBounds(bounds).join(',');
  const url = new URL(SVI_TRACT_QUERY);
  url.searchParams.set('where', "ST='47'");
  url.searchParams.set('geometry', bbox);
  url.searchParams.set('geometryType', 'esriGeometryEnvelope');
  url.searchParams.set('inSR', '4326');
  url.searchParams.set('outSR', '4326');
  url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
  url.searchParams.set(
    'outFields',
    [
      'FIPS',
      'LOCATION',
      'E_TOTPOP',
      'EP_POV150',
      'EP_UNEMP',
      'EP_HBURD',
      'EP_UNINSUR',
      'EP_NOVEH',
      'RPL_THEME1',
    ].join(','),
  );
  url.searchParams.set('returnGeometry', 'true');
  url.searchParams.set('resultRecordCount', '2000');
  url.searchParams.set('f', 'geojson');

  const geometry = normalizeFeatureCollection(await fetchJson(url.toString()));
  return {
    type: 'FeatureCollection',
    features: geometry.features.map((feature) => {
      const props = feature.properties ?? {};
      return {
        ...feature,
        properties: {
          ...props,
          source: 'CDC/ATSDR SVI; socioeconomic fields derived from 2018–2022 ACS 5-year',
          geoid: toText(props.FIPS),
          name: toText(props.LOCATION) || `Census tract ${toText(props.FIPS)}`,
          totalPopulation: toNumber(props.E_TOTPOP),
          povertyRate: toNumber(props.EP_POV150),
          unemploymentRate: toNumber(props.EP_UNEMP),
          housingBurdenRate: toNumber(props.EP_HBURD),
          uninsuredRate: toNumber(props.EP_UNINSUR),
          noVehicleRate: toNumber(props.EP_NOVEH),
          socioeconomicPercentile: toNumber(props.RPL_THEME1),
          acsVintage: '2018–2022 ACS 5-year',
        },
      } as LooseFeature;
    }),
  };
}

function findRecordArray(payload: unknown, preferredKey: string): Array<Record<string, unknown>> {
  if (!payload || typeof payload !== 'object') return [];
  const candidate = payload as Record<string, unknown>;
  if (Array.isArray(candidate[preferredKey])) {
    return (candidate[preferredKey] as unknown[]).filter(
      (item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'),
    );
  }
  const firstArray = Object.values(candidate).find((value) => Array.isArray(value));
  return Array.isArray(firstArray)
    ? firstArray.filter(
        (item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'),
      )
    : [];
}

async function fetchOpenFemaPages(
  endpoint: string,
  entityKey: string,
  filter: string,
  maxPages = 4,
): Promise<{ records: Array<Record<string, unknown>>; truncated: boolean }> {
  const records: Array<Record<string, unknown>> = [];
  const pageSize = 1000;
  let truncated = false;

  for (let page = 0; page < maxPages; page += 1) {
    const url = new URL(`${OPEN_FEMA}/${endpoint}`);
    url.searchParams.set('$filter', filter);
    url.searchParams.set('$top', String(pageSize));
    url.searchParams.set('$skip', String(page * pageSize));
    const payload = await fetchJson(url.toString(), undefined, 25_000);
    const rows = findRecordArray(payload, entityKey);
    records.push(...rows);
    if (rows.length < pageSize) return { records, truncated: false };
  }

  truncated = true;
  return { records, truncated };
}


function groupApproximateFemaPoints(
  records: Array<Record<string, unknown>>,
  kind: 'claims' | 'policies',
  truncated: boolean,
): LooseFeatureCollection {
  const groups = new Map<
    string,
    {
      latitude: number;
      longitude: number;
      count: number;
      amount: number;
      latestDate: string;
      countyCode: string;
      zip: string;
    }
  >();

  records.forEach((record) => {
    const latitude = toNumber(record.latitude);
    const longitude = toNumber(record.longitude);
    if (latitude === null || longitude === null) return;
    const key = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
    const current = groups.get(key) ?? {
      latitude,
      longitude,
      count: 0,
      amount: 0,
      latestDate: '',
      countyCode: toText(record.countyCode),
      zip: toText(record.reportedZipCode ?? record.postalCode ?? record.zipCode),
    };
    current.count += 1;
    if (kind === 'claims') {
      current.amount +=
        (toNumber(record.netBuildingPaymentAmount) ?? 0) +
        (toNumber(record.netContentsPaymentAmount) ?? 0) +
        (toNumber(record.increasedCostOfComplianceClaim) ?? 0);
      const date = toText(record.dateOfLoss ?? record.lossDate);
      if (date > current.latestDate) current.latestDate = date;
    } else {
      current.amount +=
        (toNumber(record.totalBuildingInsuranceCoverage) ?? 0) +
        (toNumber(record.totalContentsInsuranceCoverage) ?? 0);
      const date = toText(record.policyEffectiveDate ?? record.effectiveDate);
      if (date > current.latestDate) current.latestDate = date;
    }
    groups.set(key, current);
  });

  return {
    type: 'FeatureCollection',
    features: [...groups.values()].map((group) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [group.longitude, group.latitude],
      },
      properties: {
        source: kind === 'claims' ? 'OpenFEMA NFIP Claims v3' : 'OpenFEMA NFIP Policies v3',
        type: kind === 'claims' ? 'NFIP claims cluster' : 'NFIP policy records cluster',
        name: kind === 'claims' ? 'NFIP claims (approximate location)' : 'NFIP policies (approximate location)',
        recordCount: group.count,
        totalAmount: group.amount,
        latestDate: group.latestDate,
        countyCode: group.countyCode,
        zip: group.zip,
        approximateLocation: true,
        truncated,
      },
    })),
  };
}

export async function loadNfipDirect(
  bounds: Bounds,
  kind: 'claims' | 'policies',
): Promise<LooseFeatureCollection> {
  const [west, south, east, north] = clampBounds(bounds);
  const endpoint = kind === 'claims' ? 'v3/NfipClaims' : 'v3/NfipPolicies';
  const entityKey = kind === 'claims' ? 'NfipClaims' : 'NfipPolicies';
  const stateField = kind === 'claims' ? 'state' : 'propertyState';
  const filter =
    `${stateField} eq 'TN' and ` +
    `latitude ge ${south.toFixed(6)} and latitude le ${north.toFixed(6)} and ` +
    `longitude ge ${west.toFixed(6)} and longitude le ${east.toFixed(6)}`;

  const { records, truncated } = await fetchOpenFemaPages(endpoint, entityKey, filter, 4);
  return groupApproximateFemaPoints(records, kind, truncated);
}

async function loadZctaGeometry(bounds: Bounds): Promise<LooseFeatureCollection> {
  const bbox = clampBounds(bounds).join(',');
  const url = new URL(TIGER_ZCTA);
  url.searchParams.set('where', '1=1');
  url.searchParams.set('geometry', bbox);
  url.searchParams.set('geometryType', 'esriGeometryEnvelope');
  url.searchParams.set('inSR', '4326');
  url.searchParams.set('outSR', '4326');
  url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
  url.searchParams.set('outFields', 'ZCTA5,GEOID,NAME,BASENAME');
  url.searchParams.set('returnGeometry', 'true');
  url.searchParams.set('resultRecordCount', '2000');
  url.searchParams.set('f', 'geojson');
  return normalizeFeatureCollection(await fetchJson(url.toString()));
}

export async function loadFemaIhpDirect(bounds: Bounds): Promise<LooseFeatureCollection> {
  const zctas = await loadZctaGeometry(bounds);
  const zipSet = new Set(
    zctas.features
      .map((feature) => toText(feature.properties?.ZCTA5 ?? feature.properties?.GEOID))
      .filter(Boolean),
  );
  if (!zipSet.size) return emptyFeatureCollection();

  const zipCodes = [...zipSet];
  const recordGroups = await Promise.all(
    Array.from({ length: Math.ceil(zipCodes.length / 15) }, (_, index) => {
      const chunk = zipCodes.slice(index * 15, index * 15 + 15);
      const zipFilter = chunk.map((zip) => `zipCode eq '${zip}'`).join(' or ');
      return fetchOpenFemaPages(
        'v2/RegistrationIntakeIndividualsHouseholdPrograms',
        'RegistrationIntakeIndividualsHouseholdPrograms',
        `state eq 'TN' and (${zipFilter})`,
        4,
      );
    }),
  );
  const records = recordGroups.flatMap((group) => group.records);
  const truncated = recordGroups.some((group) => group.truncated);

  const summary = new Map<
    string,
    {
      registrations: number;
      ihpAmount: number;
      haAmount: number;
      onaAmount: number;
      disasters: Set<string>;
    }
  >();

  records.forEach((record) => {
    const zip = toText(record.zipCode).slice(0, 5);
    if (!zipSet.has(zip)) return;
    const current = summary.get(zip) ?? {
      registrations: 0,
      ihpAmount: 0,
      haAmount: 0,
      onaAmount: 0,
      disasters: new Set<string>(),
    };
    current.registrations += toNumber(record.totalValidRegistrations) ?? 0;
    current.ihpAmount += toNumber(record.ihpAmount) ?? 0;
    current.haAmount += toNumber(record.haAmount) ?? 0;
    current.onaAmount += toNumber(record.onaAmount) ?? 0;
    const disaster = toText(record.disasterNumber);
    if (disaster) current.disasters.add(disaster);
    summary.set(zip, current);
  });

  return {
    type: 'FeatureCollection',
    features: zctas.features
      .map((feature) => {
        const zip = toText(feature.properties?.ZCTA5 ?? feature.properties?.GEOID);
        const value = summary.get(zip);
        if (!value) return null;
        return {
          ...feature,
          properties: {
            ...(feature.properties ?? {}),
            source: 'OpenFEMA RI-IHP v2',
            type: 'FEMA Individual Assistance by ZIP',
            name: `ZIP ${zip}`,
            zip,
            registrations: value.registrations,
            ihpAmount: value.ihpAmount,
            haAmount: value.haAmount,
            onaAmount: value.onaAmount,
            disasterCount: value.disasters.size,
            truncated,
          },
        } as LooseFeature;
      })
      .filter((feature): feature is LooseFeature => Boolean(feature)),
  };
}

function overpassCategory(tags: Record<string, unknown>): string {
  const amenity = toText(tags.amenity);
  const emergency = toText(tags.emergency);
  if (emergency === 'shelter') return 'Shelter';
  if (amenity === 'hospital') return 'Hospital';
  if (amenity === 'clinic') return 'Clinic';
  if (amenity === 'fire_station') return 'Fire station';
  if (amenity === 'police') return 'Police';
  if (amenity === 'social_facility') return 'Social service';
  if (amenity === 'community_centre') return 'Community centre';
  return amenity || emergency || 'Community resource';
}

async function fetchOverpass(query: string): Promise<Record<string, unknown>> {
  // Public Overpass instances are volunteer-operated and can be temporarily
  // overloaded. Try two globally covered instances listed by the OSM project.
  const endpoints = [
    'https://overpass.private.coffee/api/interpreter',
    'https://overpass-api.de/api/interpreter',
  ];
  const errors: string[] = [];

  for (const endpoint of endpoints) {
    try {
      const payload = await fetchJson(
        endpoint,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ data: query }).toString(),
        },
        30_000,
      );
      return payload as Record<string, unknown>;
    } catch (error) {
      errors.push(`${new URL(endpoint).host}: ${error instanceof Error ? error.message : 'request failed'}`);
    }
  }

  throw new Error(`All Overpass mirrors failed (${errors.join('; ')})`);
}

export async function loadOsmCommunityResourcesDirect(bounds: Bounds): Promise<LooseFeatureCollection> {
  const [west, south, east, north] = clampBounds(bounds);
  const bbox = `${south},${west},${north},${east}`;
  const query = `
[out:json][timeout:20];
(
  nwr["amenity"~"^(hospital|clinic|fire_station|police|social_facility|community_centre)$"](${bbox});
  nwr["emergency"="shelter"](${bbox});
);
out center tags;
`;
  const payload = await fetchOverpass(query);

  const elements = Array.isArray(payload.elements)
    ? (payload.elements as Array<Record<string, unknown>>)
    : [];

  return {
    type: 'FeatureCollection',
    features: elements
      .map((element) => {
        const center =
          element.center && typeof element.center === 'object'
            ? (element.center as Record<string, unknown>)
            : {};
        const latitude = toNumber(element.lat ?? center.lat);
        const longitude = toNumber(element.lon ?? center.lon);
        if (latitude === null || longitude === null) return null;
        const tags =
          element.tags && typeof element.tags === 'object'
            ? (element.tags as Record<string, unknown>)
            : {};
        const category = overpassCategory(tags);
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [longitude, latitude] },
          properties: {
            source: 'OpenStreetMap contributors / Overpass API',
            type: 'VGI community resource',
            category,
            name: toText(tags.name) || category,
            operator: toText(tags.operator),
            osmId: `${element.type ?? 'object'}/${element.id ?? ''}`,
          },
        } as LooseFeature;
      })
      .filter((feature): feature is LooseFeature => Boolean(feature)),
  };
}

