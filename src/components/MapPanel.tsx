import { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import { emptyFeatureCollection, type LooseFeatureCollection } from '../../shared/liveFlood';
import type { RemoteFloodLayerId, RemoteFloodLayerState } from '../flood/catalog';
import type { RemoteCommunityLayerId, RemoteCommunityLayerState } from '../community/catalog';
import {
  loadFemaFloodHazard,
  loadNoaaTennesseeGauges,
  loadUsgsTennesseeGauges,
} from '../services/floodApi';
import {
  loadAcsSocioeconomic,
  loadCdcSvi,
  loadFemaIhp,
  loadNfipClaims,
  loadOsmResources,
} from '../services/communityApi';
import type { BasemapId } from '../types';
import {
  ActivityIcon,
  BuildingIcon,
  ClockIcon,
  LayersIcon,
  MapPinIcon,
  RadarIcon,
  SearchIcon,
} from './Icons';

interface MapPanelProps {
  floodLayers: RemoteFloodLayerState[];
  communityLayers: RemoteCommunityLayerState[];
  incidentName: string;
  incidentDescription: string;
  selectedTime: string;
  fitBounds?: [number, number, number, number];
  basemap: BasemapId;
  basemapOpacity: number;
}

interface RemoteDataState {
  fema: LooseFeatureCollection;
  usgs: LooseFeatureCollection;
  noaaObserved: LooseFeatureCollection;
  noaaForecast: LooseFeatureCollection;
}

const EMPTY_REMOTE_DATA: RemoteDataState = {
  fema: emptyFeatureCollection(),
  usgs: emptyFeatureCollection(),
  noaaObserved: emptyFeatureCollection(),
  noaaForecast: emptyFeatureCollection(),
};

interface RemoteCommunityDataState {
  svi: LooseFeatureCollection;
  acs: LooseFeatureCollection;
  nfipClaims: LooseFeatureCollection;
  ihp: LooseFeatureCollection;
  osm: LooseFeatureCollection;
}

const EMPTY_COMMUNITY_DATA: RemoteCommunityDataState = {
  svi: emptyFeatureCollection(),
  acs: emptyFeatureCollection(),
  nfipClaims: emptyFeatureCollection(),
  ihp: emptyFeatureCollection(),
  osm: emptyFeatureCollection(),
};

const styleUrl =
  import.meta.env.VITE_MAP_STYLE_URL ||
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const tdotImageryTileUrl =
  import.meta.env.VITE_TDOT_IMAGERY_TILE_URL ||
  'https://tnmap.tn.gov/arcgis/services/' +
    'BASEMAPS/IMAGERY_WEB_MERCATOR/MapServer/WMSServer' +
    '?SERVICE=WMS' +
    '&VERSION=1.1.1' +
    '&REQUEST=GetMap' +
    '&LAYERS=0' +
    '&STYLES=' +
    '&FORMAT=image/png' +
    '&TRANSPARENT=TRUE' +
    '&SRS=EPSG:3857' +
    '&BBOX={bbox-epsg-3857}' +
    '&WIDTH=256' +
    '&HEIGHT=256';

const naipTileUrl =
  import.meta.env.VITE_NAIP_TILE_URL ||
  'https://gis.apfo.usda.gov/arcgis/rest/services/' +
    'NAIP/USDA_CONUS_PRIME/ImageServer/tile/{z}/{y}/{x}';

function femaExportTileUrl(where: string): string {
  const layerDefs = encodeURIComponent(JSON.stringify({ 28: where }));
  return (
    'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/export' +
    '?bbox={bbox-epsg-3857}' +
    '&bboxSR=3857' +
    '&imageSR=3857' +
    '&size=256,256' +
    '&format=png32' +
    '&transparent=true' +
    '&layers=show:28' +
    `&layerDefs=${layerDefs}` +
    '&f=image'
  );
}

// FEMA layer 28 is the official NFHL Flood Hazard Zones layer.  For display,
// use the ArcGIS map-image endpoint instead of downloading thousands of
// polygons into the browser.  A vector query is still used later, but only at
// close zoom levels for feature details / counts.
const femaFloodHazardTileUrl = femaExportTileUrl(
  "SFHA_TF = 'T' OR ZONE_SUBTY = '0.2 PCT ANNUAL CHANCE FLOOD HAZARD'",
);

const femaFloodwayTileUrl = femaExportTileUrl(
  "ZONE_SUBTY IN ('FLOODWAY','FLOODWAY CONTAINED IN CHANNEL','RIVERINE FLOODWAY SHOWN IN COASTAL ZONE')",
);

const nwmHighWaterTileUrl =
  'https://maps.water.noaa.gov/server/rest/services/nwm/' +
  'srf_12hr_max_high_water_probability/MapServer/export' +
  '?bbox={bbox-epsg-3857}' +
  '&bboxSR=3857' +
  '&imageSR=3857' +
  '&size=256,256' +
  '&format=png32' +
  '&transparent=true' +
  '&layers=show:0,1' +
  '&f=image';

const basemapLabels: Record<BasemapId, string> = {
  dark: 'Dark Reference',
  tdot: 'TDOT Aerial Imagery',
  naip: 'USDA NAIP Mosaic',
};

const remoteMapLayerIds: Record<RemoteFloodLayerId, string[]> = {
  fema_floodplain: ['fema-hazard-raster-layer'],
  fema_floodway: ['fema-floodway-raster-layer'],
  usgs_gauges: ['usgs-gauge-halo', 'usgs-gauge-points'],
  noaa_observed: ['noaa-observed-halo', 'noaa-observed-points'],
  noaa_forecast: ['noaa-forecast-halo', 'noaa-forecast-points'],
  nwm_high_water: ['nwm-high-water-layer'],
};

const communityMapLayerIds: Record<RemoteCommunityLayerId, string[]> = {
  cdc_svi: ['cdc-svi-fill', 'cdc-svi-outline'],
  acs_socioeconomic: ['acs-fill', 'acs-outline'],
  nfip_claims: ['nfip-claims-halo', 'nfip-claims-points'],
  fema_ihp: ['fema-ihp-fill', 'fema-ihp-outline'],
  osm_resources: ['osm-resource-halo', 'osm-resource-points'],
};

const timeLabels: Record<string, string> = {
  now: 'Current conditions',
  '6h': 'Forecast +6 hours',
  '12h': 'Forecast +12 hours',
  '24h': 'Forecast +24 hours',
};

const statusColorExpression: maplibregl.ExpressionSpecification = [
  'match',
  ['get', 'status'],
  'major',
  '#d95cff',
  'moderate',
  '#ff4f68',
  'minor',
  '#ff9f43',
  'action',
  '#ffe066',
  'no_flooding',
  '#49d985',
  'low_threshold',
  '#b07d45',
  'obs_not_current',
  '#aeb8c4',
  'out_of_service',
  '#687584',
  '#66b8ef',
];

function stringifyValue(value: unknown, fallback = '—'): string {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function createPopupContent(properties: Record<string, unknown>) {
  const wrapper = document.createElement('div');
  wrapper.className = 'hazard-popup';

  const eyebrow = document.createElement('span');
  eyebrow.className = 'hazard-popup-eyebrow';
  eyebrow.textContent = stringifyValue(
    properties.source ?? properties.type,
    'Map intelligence',
  );

  const title = document.createElement('strong');
  title.textContent = stringifyValue(
    properties.name ?? properties.location ?? properties.waterbody ?? properties.label,
    'Map feature',
  );

  const details = document.createElement('div');
  details.className = 'hazard-popup-details';

  const rows: Array<[string, unknown]> = [];
  if (properties.status) rows.push(['Flood status', properties.status]);
  if (properties.observed) rows.push(['Observed stage', `${properties.observed} ${stringifyValue(properties.units, '')}`]);
  if (properties.gageHeightFt !== null && properties.gageHeightFt !== undefined) {
    rows.push(['Gage height', `${properties.gageHeightFt} ft`]);
  }
  if (properties.dischargeCfs !== null && properties.dischargeCfs !== undefined) {
    rows.push(['Discharge', `${Number(properties.dischargeCfs).toLocaleString()} cfs`]);
  }
  if (properties.obstime ?? properties.observedAt) {
    rows.push(['Time', properties.obstime ?? properties.observedAt]);
  }
  if (properties.waterbody) rows.push(['Waterbody', properties.waterbody]);
  if (properties.quality) rows.push(['HWM quality', properties.quality]);
  if (properties.elevation !== null && properties.elevation !== undefined) {
    rows.push(['HWM elevation', `${properties.elevation} ft`]);
  }
  if (properties.FLD_ZONE) rows.push(['FEMA zone', properties.FLD_ZONE]);
  if (properties.ZONE_SUBTY) rows.push(['Zone subtype', properties.ZONE_SUBTY]);
  if (properties.RPL_THEMES !== null && properties.RPL_THEMES !== undefined) rows.push(['Overall SVI', Number(properties.RPL_THEMES).toFixed(3)]);
  if (properties.RPL_THEME1 !== null && properties.RPL_THEME1 !== undefined) rows.push(['SVI socioeconomic', Number(properties.RPL_THEME1).toFixed(3)]);
  if (properties.RPL_THEME2 !== null && properties.RPL_THEME2 !== undefined) rows.push(['SVI household', Number(properties.RPL_THEME2).toFixed(3)]);
  if (properties.povertyRate !== null && properties.povertyRate !== undefined) rows.push(['Poverty', formatPercent(properties.povertyRate)]);
  if (properties.medianHouseholdIncome !== null && properties.medianHouseholdIncome !== undefined) rows.push(['Median income', formatMoney(properties.medianHouseholdIncome)]);
  if (properties.unemploymentRate !== null && properties.unemploymentRate !== undefined) rows.push(['Unemployment', formatPercent(properties.unemploymentRate)]);
  if (properties.noVehicleRate !== null && properties.noVehicleRate !== undefined) rows.push(['No vehicle', formatPercent(properties.noVehicleRate)]);
  if (properties.recordCount !== null && properties.recordCount !== undefined) rows.push(['Records', formatNumber(properties.recordCount)]);
  if (properties.totalAmount !== null && properties.totalAmount !== undefined) rows.push(['Amount', formatMoney(properties.totalAmount)]);
  if (properties.registrations !== null && properties.registrations !== undefined) rows.push(['Registrations', formatNumber(properties.registrations)]);
  if (properties.ihpAmount !== null && properties.ihpAmount !== undefined) rows.push(['IHP awards', formatMoney(properties.ihpAmount)]);
  if (properties.category) rows.push(['Resource type', properties.category]);
  if (properties.operator) rows.push(['Operator', properties.operator]);
  if (properties.approximateLocation) rows.push(['Location', 'FEMA approximate coordinate']);

  rows.slice(0, 7).forEach(([label, value]) => {
    const row = document.createElement('span');
    const key = document.createElement('b');
    key.textContent = label;
    const val = document.createElement('i');
    val.textContent = stringifyValue(value);
    row.append(key, val);
    details.append(row);
  });

  wrapper.append(eyebrow, title, details);
  return wrapper;
}

function getLayer(
  floodLayers: RemoteFloodLayerState[],
  id: RemoteFloodLayerId,
): RemoteFloodLayerState | undefined {
  return floodLayers.find((layer) => layer.id === id);
}

function getCommunityLayer(
  communityLayers: RemoteCommunityLayerState[],
  id: RemoteCommunityLayerId,
): RemoteCommunityLayerState | undefined {
  return communityLayers.find((layer) => layer.id === id);
}

function formatNumber(value: unknown): string {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toLocaleString() : '—';
}

function formatPercent(value: unknown): string {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(1)}%` : '—';
}

function formatMoney(value: unknown): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(parsed);
}

function setGeoJsonSource(
  map: MapLibreMap,
  sourceId: string,
  data: LooseFeatureCollection,
) {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined;
  if (!source) return;
  source.setData(data as Parameters<GeoJSONSource['setData']>[0]);
}

export function MapPanel({
  floodLayers,
  communityLayers,
  incidentName,
  incidentDescription,
  selectedTime,
  fitBounds,
  basemap,
  basemapOpacity,
}: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const loadedRemote = useRef(new Set<string>());
  const [remoteData, setRemoteData] = useState<RemoteDataState>(EMPTY_REMOTE_DATA);
  const [communityData, setCommunityData] = useState<RemoteCommunityDataState>(EMPTY_COMMUNITY_DATA);
  const [mapBounds, setMapBounds] = useState<[number, number, number, number]>();
  const [sourceMessage, setSourceMessage] = useState('Official feeds ready');
  const [communityMessage, setCommunityMessage] = useState('Public community data ready');
  const [mapZoom, setMapZoom] = useState(10.2);

  const sviEnabled = Boolean(getCommunityLayer(communityLayers, 'cdc_svi')?.enabled);
  const acsEnabled = Boolean(getCommunityLayer(communityLayers, 'acs_socioeconomic')?.enabled);
  const nfipClaimsEnabled = Boolean(getCommunityLayer(communityLayers, 'nfip_claims')?.enabled);
  const ihpEnabled = Boolean(getCommunityLayer(communityLayers, 'fema_ihp')?.enabled);
  const osmEnabled = Boolean(getCommunityLayer(communityLayers, 'osm_resources')?.enabled);

  const metrics = useMemo(
    () => ({
      liveGauges: remoteData.usgs.features.length + remoteData.noaaObserved.features.length,
      femaAreas: remoteData.fema.features.length,
    }),
    [remoteData],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: [-83.92, 35.98],
      zoom: 10.2,
      pitch: 18,
      bearing: -7,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      'bottom-right',
    );
    map.addControl(new maplibregl.ScaleControl({ unit: 'imperial' }), 'bottom-left');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    let moveTimer: number | undefined;
    const updateBounds = () => {
      window.clearTimeout(moveTimer);
      moveTimer = window.setTimeout(() => {
        const bounds = map.getBounds();
        setMapBounds([
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth(),
        ]);
        setMapZoom(map.getZoom());
      }, 280);
    };

    map.on('load', () => {
      const firstSymbolLayerId = map
        .getStyle()
        .layers?.find((layer) => layer.type === 'symbol')?.id;

      map.addSource('tdot-imagery-source', {
        type: 'raster',
        tiles: [tdotImageryTileUrl],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 22,
        attribution: 'Tennessee Department of Transportation — Aerial Surveys',
      });
      map.addLayer(
        {
          id: 'tdot-imagery-layer',
          type: 'raster',
          source: 'tdot-imagery-source',
          layout: { visibility: basemap === 'tdot' ? 'visible' : 'none' },
          paint: {
            'raster-opacity': basemapOpacity,
            'raster-fade-duration': 0,
            'raster-resampling': 'linear',
            'raster-saturation': -0.08,
            'raster-contrast': 0.06,
            'raster-brightness-min': 0.02,
            'raster-brightness-max': 0.92,
          },
        },
        firstSymbolLayerId,
      );

      map.addSource('naip-imagery-source', {
        type: 'raster',
        tiles: [naipTileUrl],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 17,
        attribution: 'USDA Farm Service Agency — National Agriculture Imagery Program',
      });
      map.addLayer(
        {
          id: 'naip-imagery-layer',
          type: 'raster',
          source: 'naip-imagery-source',
          layout: { visibility: basemap === 'naip' ? 'visible' : 'none' },
          paint: {
            'raster-opacity': basemapOpacity,
            'raster-fade-duration': 0,
            'raster-resampling': 'linear',
            'raster-saturation': -0.04,
            'raster-contrast': 0.05,
            'raster-brightness-min': 0.02,
            'raster-brightness-max': 0.94,
          },
        },
        firstSymbolLayerId,
      );

      // FEMA NFHL display layers.  These are map-image tiles, so they stay
      // visible even when the current viewport contains too many polygons for
      // a practical GeoJSON query.
      map.addSource('fema-hazard-raster-source', {
        type: 'raster',
        tiles: [femaFloodHazardTileUrl],
        tileSize: 256,
        attribution: 'FEMA National Flood Hazard Layer (NFHL)',
      });
      map.addLayer(
        {
          id: 'fema-hazard-raster-layer',
          type: 'raster',
          source: 'fema-hazard-raster-source',
          layout: { visibility: 'none' },
          paint: {
            'raster-opacity': 0.54,
            'raster-fade-duration': 0,
            'raster-resampling': 'linear',
          },
        },
        firstSymbolLayerId,
      );

      map.addSource('fema-floodway-raster-source', {
        type: 'raster',
        tiles: [femaFloodwayTileUrl],
        tileSize: 256,
        attribution: 'FEMA National Flood Hazard Layer (NFHL)',
      });
      map.addLayer(
        {
          id: 'fema-floodway-raster-layer',
          type: 'raster',
          source: 'fema-floodway-raster-source',
          layout: { visibility: 'none' },
          paint: {
            'raster-opacity': 0.72,
            'raster-fade-duration': 0,
            'raster-resampling': 'linear',
          },
        },
        firstSymbolLayerId,
      );

      map.addSource('nwm-high-water-source', {
        type: 'raster',
        tiles: [nwmHighWaterTileUrl],
        tileSize: 256,
        attribution: 'NOAA/NWS National Water Model',
      });
      map.addLayer(
        {
          id: 'nwm-high-water-layer',
          type: 'raster',
          source: 'nwm-high-water-source',
          layout: { visibility: 'none' },
          paint: { 'raster-opacity': 0.66, 'raster-fade-duration': 0 },
        },
        firstSymbolLayerId,
      );

      map.addSource('fema-source', { type: 'geojson', data: emptyFeatureCollection() });
      map.addLayer({
        id: 'fema-floodplain-fill',
        type: 'fill',
        source: 'fema-source',
        filter: [
          'any',
          ['==', ['get', 'SFHA_TF'], 'T'],
          ['==', ['get', 'ZONE_SUBTY'], '0.2 PCT ANNUAL CHANCE FLOOD HAZARD'],
        ],
        layout: { visibility: 'none' },
        paint: {
          'fill-color': [
            'match',
            ['get', 'FLD_ZONE'],
            'AE', '#28b8ff',
            'A', '#159ce8',
            'AH', '#30c6f2',
            'AO', '#40d3e8',
            'VE', '#4d6cff',
            'V', '#5057e8',
            'X', '#84b9d6',
            '#3db7e8',
          ],
          'fill-opacity': 0.28,
        },
      });
      map.addLayer({
        id: 'fema-floodplain-outline',
        type: 'line',
        source: 'fema-source',
        filter: [
          'any',
          ['==', ['get', 'SFHA_TF'], 'T'],
          ['==', ['get', 'ZONE_SUBTY'], '0.2 PCT ANNUAL CHANCE FLOOD HAZARD'],
        ],
        layout: { visibility: 'none' },
        paint: { 'line-color': '#63d9ff', 'line-width': 1.1, 'line-opacity': 0.72 },
      });
      map.addLayer({
        id: 'fema-floodway-fill',
        type: 'fill',
        source: 'fema-source',
        filter: [
          'any',
          ['==', ['get', 'FLOODWAY'], 'FLOODWAY'],
          ['==', ['get', 'ZONE_SUBTY'], 'FLOODWAY'],
        ],
        layout: { visibility: 'none' },
        paint: { 'fill-color': '#16e0d0', 'fill-opacity': 0.42 },
      });
      map.addLayer({
        id: 'fema-floodway-outline',
        type: 'line',
        source: 'fema-source',
        filter: [
          'any',
          ['==', ['get', 'FLOODWAY'], 'FLOODWAY'],
          ['==', ['get', 'ZONE_SUBTY'], 'FLOODWAY'],
        ],
        layout: { visibility: 'none' },
        paint: { 'line-color': '#83fff3', 'line-width': 1.6, 'line-opacity': 0.88 },
      });

      map.addSource('usgs-gauge-source', { type: 'geojson', data: emptyFeatureCollection() });
      map.addLayer({
        id: 'usgs-gauge-halo',
        type: 'circle',
        source: 'usgs-gauge-source',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': 11,
          'circle-color': '#1dd8ff',
          'circle-opacity': 0.12,
          'circle-blur': 0.35,
        },
      });
      map.addLayer({
        id: 'usgs-gauge-points',
        type: 'circle',
        source: 'usgs-gauge-source',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': 4.4,
          'circle-color': '#bff6ff',
          'circle-stroke-color': '#14bfe9',
          'circle-stroke-width': 1.7,
          'circle-opacity': 0.96,
        },
      });

      map.addSource('noaa-observed-source', { type: 'geojson', data: emptyFeatureCollection() });
      map.addLayer({
        id: 'noaa-observed-halo',
        type: 'circle',
        source: 'noaa-observed-source',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': 12,
          'circle-color': statusColorExpression,
          'circle-opacity': 0.14,
          'circle-blur': 0.3,
        },
      });
      map.addLayer({
        id: 'noaa-observed-points',
        type: 'circle',
        source: 'noaa-observed-source',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': 5.2,
          'circle-color': statusColorExpression,
          'circle-stroke-color': '#f4fbff',
          'circle-stroke-width': 1.3,
          'circle-opacity': 0.96,
        },
      });

      map.addSource('noaa-forecast-source', { type: 'geojson', data: emptyFeatureCollection() });
      map.addLayer({
        id: 'noaa-forecast-halo',
        type: 'circle',
        source: 'noaa-forecast-source',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': 13,
          'circle-color': '#08121e',
          'circle-opacity': 0.12,
        },
      });
      map.addLayer({
        id: 'noaa-forecast-points',
        type: 'circle',
        source: 'noaa-forecast-source',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': 6.4,
          'circle-color': 'rgba(8, 18, 30, 0.42)',
          'circle-stroke-color': statusColorExpression,
          'circle-stroke-width': 2.5,
          'circle-opacity': 0.96,
        },
      });


      // Public community evidence -------------------------------------------------
      map.addSource('cdc-svi-source', { type: 'geojson', data: emptyFeatureCollection() });
      map.addLayer({
        id: 'cdc-svi-fill',
        type: 'fill',
        source: 'cdc-svi-source',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': [
            'interpolate', ['linear'], ['coalesce', ['to-number', ['get', 'RPL_THEMES']], 0],
            0, '#162b3d', 0.35, '#3c6ca6', 0.65, '#875ac8', 0.85, '#db5e9f', 1, '#ff6f7d',
          ],
          'fill-opacity': 0.46,
        },
      });
      map.addLayer({
        id: 'cdc-svi-outline',
        type: 'line',
        source: 'cdc-svi-source',
        layout: { visibility: 'none' },
        paint: { 'line-color': '#d7a7ff', 'line-width': 0.7, 'line-opacity': 0.32 },
      });

      map.addSource('acs-source', { type: 'geojson', data: emptyFeatureCollection() });
      map.addLayer({
        id: 'acs-fill',
        type: 'fill',
        source: 'acs-source',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': [
            'interpolate', ['linear'], ['coalesce', ['to-number', ['get', 'povertyRate']], 0],
            0, '#143b54', 10, '#246e87', 20, '#a7884f', 35, '#dc6d50', 50, '#ef536b',
          ],
          'fill-opacity': 0.42,
        },
      });
      map.addLayer({
        id: 'acs-outline',
        type: 'line',
        source: 'acs-source',
        layout: { visibility: 'none' },
        paint: { 'line-color': '#ffc278', 'line-width': 0.7, 'line-opacity': 0.3 },
      });

      map.addSource('nfip-claims-source', { type: 'geojson', data: emptyFeatureCollection() });
      map.addLayer({
        id: 'nfip-claims-halo',
        type: 'circle',
        source: 'nfip-claims-source',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': ['step', ['coalesce', ['to-number', ['get', 'recordCount']], 1], 8, 5, 12, 20, 18],
          'circle-color': '#ff805f', 'circle-opacity': 0.1, 'circle-blur': 0.35,
        },
      });
      map.addLayer({
        id: 'nfip-claims-points',
        type: 'circle',
        source: 'nfip-claims-source',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': ['step', ['coalesce', ['to-number', ['get', 'recordCount']], 1], 4, 5, 6, 20, 9],
          'circle-color': '#ff8f6b', 'circle-stroke-color': '#fff0e9', 'circle-stroke-width': 1.1,
          'circle-opacity': 0.88,
        },
      });

      map.addSource('fema-ihp-source', { type: 'geojson', data: emptyFeatureCollection() });
      map.addLayer({
        id: 'fema-ihp-fill',
        type: 'fill',
        source: 'fema-ihp-source',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': [
            'step', ['coalesce', ['to-number', ['get', 'registrations']], 0],
            '#16304a', 10, '#235d7d', 100, '#777649', 500, '#b05b54', 1500, '#df4e75',
          ],
          'fill-opacity': 0.44,
        },
      });
      map.addLayer({
        id: 'fema-ihp-outline', type: 'line', source: 'fema-ihp-source', layout: { visibility: 'none' },
        paint: { 'line-color': '#ff8aad', 'line-width': 0.8, 'line-opacity': 0.32 },
      });

      map.addSource('osm-resources-source', { type: 'geojson', data: emptyFeatureCollection() });
      map.addLayer({
        id: 'osm-resource-halo',
        type: 'circle',
        source: 'osm-resources-source',
        layout: { visibility: 'none' },
        paint: { 'circle-radius': 9, 'circle-color': '#5de8c1', 'circle-opacity': 0.1, 'circle-blur': 0.25 },
      });
      map.addLayer({
        id: 'osm-resource-points',
        type: 'circle',
        source: 'osm-resources-source',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': 4.5,
          'circle-color': [
            'match', ['get', 'category'],
            'Hospital', '#69d5ff', 'Clinic', '#80e7e4', 'Shelter', '#9d8cff',
            'Fire station', '#ff8c68', 'Police', '#74a7ff', 'Social service', '#e4b65b',
            'Community centre', '#5be1a7', '#7fd9bf',
          ],
          'circle-stroke-color': '#eafff8', 'circle-stroke-width': 1.1, 'circle-opacity': 0.92,
        },
      });

      const popupLayers = [
        'usgs-gauge-points',
        'noaa-observed-points',
        'noaa-forecast-points',
        'fema-floodplain-fill',
        'fema-floodway-fill',
        'cdc-svi-fill',
        'acs-fill',
        'nfip-claims-points',
        'fema-ihp-fill',
        'osm-resource-points',
      ];

      popupLayers.forEach((layerId) => {
        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = '';
        });
        map.on('click', layerId, (event) => {
          const feature = event.features?.[0];
          if (!feature) return;
          const properties = feature.properties ?? {};

          new maplibregl.Popup({ offset: 15, closeButton: false })
            .setLngLat(event.lngLat)
            .setDOMContent(createPopupContent(properties))
            .addTo(map);
        });
      });

      updateBounds();
    });

    map.on('moveend', updateBounds);
    mapRef.current = map;

    return () => {
      window.clearTimeout(moveTimer);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // FEMA visualization comes from the official map-image service above.
  // Only request vector polygons when the user is zoomed in far enough that
  // the query is small.  This keeps popup/metrics support without making the
  // display depend on a huge FeatureServer response.
  useEffect(() => {
    const enabled = Boolean(
      getLayer(floodLayers, 'fema_floodplain')?.enabled ||
        getLayer(floodLayers, 'fema_floodway')?.enabled,
    );
    const map = mapRef.current;
    if (!enabled || !mapBounds || !map) return;

    if (map.getZoom() < 11.25) {
      setSourceMessage('FEMA NFHL map active · zoom in for polygon details');
      return;
    }

    let cancelled = false;
    setSourceMessage('Loading FEMA NFHL polygon details…');
    void loadFemaFloodHazard(mapBounds)
      .then((result) => {
        if (cancelled) return;
        setRemoteData((current) => ({ ...current, fema: result }));
        setSourceMessage(
          `FEMA NFHL · ${result.features.length.toLocaleString()} detailed polygons in view`,
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSourceMessage(
          `FEMA map active · detail query unavailable (${error instanceof Error ? error.message : 'request failed'})`,
        );
      });

    return () => {
      cancelled = true;
    };
  }, [floodLayers, mapBounds]);

  useEffect(() => {
    if (!getLayer(floodLayers, 'usgs_gauges')?.enabled || loadedRemote.current.has('usgs')) return;
    loadedRemote.current.add('usgs');
    void loadUsgsTennesseeGauges()
      .then((result) => {
        setRemoteData((current) => ({ ...current, usgs: result }));
        setSourceMessage(`USGS · ${result.features.length.toLocaleString()} Tennessee gauges`);
      })
      .catch((error: unknown) => {
        loadedRemote.current.delete('usgs');
        setSourceMessage(`USGS unavailable · ${error instanceof Error ? error.message : 'request failed'}`);
      });
  }, [floodLayers]);

  useEffect(() => {
    if (!getLayer(floodLayers, 'noaa_observed')?.enabled || loadedRemote.current.has('noaaObserved')) return;
    loadedRemote.current.add('noaaObserved');
    void loadNoaaTennesseeGauges('observed')
      .then((result) => {
        setRemoteData((current) => ({ ...current, noaaObserved: result }));
        setSourceMessage(`NOAA/NWS · ${result.features.length.toLocaleString()} observed river gauges`);
      })
      .catch((error: unknown) => {
        loadedRemote.current.delete('noaaObserved');
        setSourceMessage(`NOAA observed feed unavailable · ${error instanceof Error ? error.message : 'request failed'}`);
      });
  }, [floodLayers]);

  useEffect(() => {
    if (!getLayer(floodLayers, 'noaa_forecast')?.enabled || loadedRemote.current.has('noaaForecast')) return;
    loadedRemote.current.add('noaaForecast');
    void loadNoaaTennesseeGauges('forecast')
      .then((result) => {
        setRemoteData((current) => ({ ...current, noaaForecast: result }));
        setSourceMessage(`NWS forecast · ${result.features.length.toLocaleString()} Tennessee gauges`);
      })
      .catch((error: unknown) => {
        loadedRemote.current.delete('noaaForecast');
        setSourceMessage(`NOAA forecast unavailable · ${error instanceof Error ? error.message : 'request failed'}`);
      });
  }, [floodLayers]);


  useEffect(() => {
    if (!mapBounds || !sviEnabled) return;
    let cancelled = false;
    setCommunityMessage('Loading CDC SVI 2022…');
    void loadCdcSvi(mapBounds)
      .then((result) => {
        if (cancelled) return;
        setCommunityData((current) => ({ ...current, svi: result }));
        setCommunityMessage(`CDC SVI · ${result.features.length.toLocaleString()} tracts in view`);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCommunityMessage(`CDC SVI unavailable · ${error instanceof Error ? error.message : 'request failed'}`);
      });
    return () => { cancelled = true; };
  }, [sviEnabled, mapBounds]);

  useEffect(() => {
    if (!mapBounds || !acsEnabled) return;
    let cancelled = false;
    setCommunityMessage('Loading ACS-derived socioeconomic indicators…');
    void loadAcsSocioeconomic(mapBounds)
      .then((result) => {
        if (cancelled) return;
        setCommunityData((current) => ({ ...current, acs: result }));
        setCommunityMessage(`ACS-derived · ${result.features.length.toLocaleString()} tracts in view`);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCommunityMessage(`ACS unavailable · ${error instanceof Error ? error.message : 'request failed'}`);
      });
    return () => { cancelled = true; };
  }, [acsEnabled, mapBounds]);

  useEffect(() => {
    if (!mapBounds || !nfipClaimsEnabled) return;
    if (mapZoom < 9) {
      setCommunityMessage('NFIP claims enabled · zoom to level 9+ for approximate-location clusters');
      return;
    }
    let cancelled = false;
    setCommunityMessage('Loading OpenFEMA NFIP claims…');
    void loadNfipClaims(mapBounds)
      .then((result) => {
        if (cancelled) return;
        setCommunityData((current) => ({ ...current, nfipClaims: result }));
        setCommunityMessage(`NFIP claims · ${result.features.length.toLocaleString()} approximate clusters in view`);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCommunityMessage(`NFIP claims unavailable · ${error instanceof Error ? error.message : 'request failed'}`);
      });
    return () => { cancelled = true; };
  }, [nfipClaimsEnabled, mapBounds, mapZoom]);

  useEffect(() => {
    if (!mapBounds || !ihpEnabled) return;
    if (mapZoom < 7.5) {
      setCommunityMessage('FEMA assistance enabled · zoom in for ZIP-level summaries');
      return;
    }
    let cancelled = false;
    setCommunityMessage('Loading FEMA Individual Assistance summaries…');
    void loadFemaIhp(mapBounds)
      .then((result) => {
        if (cancelled) return;
        setCommunityData((current) => ({ ...current, ihp: result }));
        setCommunityMessage(`FEMA assistance · ${result.features.length.toLocaleString()} ZIP areas in view`);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCommunityMessage(`FEMA assistance unavailable · ${error instanceof Error ? error.message : 'request failed'}`);
      });
    return () => { cancelled = true; };
  }, [ihpEnabled, mapBounds, mapZoom]);

  useEffect(() => {
    if (!mapBounds || !osmEnabled) return;
    if (mapZoom < 9) {
      setCommunityMessage('OSM resources enabled · zoom to level 9+ to query local volunteer-mapped resources');
      return;
    }
    let cancelled = false;
    setCommunityMessage('Loading OpenStreetMap community resources…');
    void loadOsmResources(mapBounds)
      .then((result) => {
        if (cancelled) return;
        setCommunityData((current) => ({ ...current, osm: result }));
        setCommunityMessage(`OSM · ${result.features.length.toLocaleString()} community resources in view`);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCommunityMessage(`OSM unavailable · ${error instanceof Error ? error.message : 'request failed'}`);
      });
    return () => { cancelled = true; };
  }, [osmEnabled, mapBounds, mapZoom]);


  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const updateRemoteSources = () => {
      setGeoJsonSource(map, 'fema-source', remoteData.fema);
      setGeoJsonSource(map, 'usgs-gauge-source', remoteData.usgs);
      setGeoJsonSource(map, 'noaa-observed-source', remoteData.noaaObserved);
      setGeoJsonSource(map, 'noaa-forecast-source', remoteData.noaaForecast);
    };
    if (map.isStyleLoaded()) updateRemoteSources();
    else map.once('load', updateRemoteSources);
  }, [remoteData]);


  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const updateCommunitySources = () => {
      setGeoJsonSource(map, 'cdc-svi-source', communityData.svi);
      setGeoJsonSource(map, 'acs-source', communityData.acs);
      setGeoJsonSource(map, 'nfip-claims-source', communityData.nfipClaims);
      setGeoJsonSource(map, 'fema-ihp-source', communityData.ihp);
      setGeoJsonSource(map, 'osm-resources-source', communityData.osm);
    };
    if (map.isStyleLoaded()) updateCommunitySources();
    else map.once('load', updateCommunitySources);
  }, [communityData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const applyBasemapState = () => {
      const tdotVisible = basemap === 'tdot';
      const naipVisible = basemap === 'naip';
      if (map.getLayer('tdot-imagery-layer')) {
        map.setLayoutProperty('tdot-imagery-layer', 'visibility', tdotVisible ? 'visible' : 'none');
        map.setPaintProperty('tdot-imagery-layer', 'raster-opacity', basemapOpacity);
      }
      if (map.getLayer('naip-imagery-layer')) {
        map.setLayoutProperty('naip-imagery-layer', 'visibility', naipVisible ? 'visible' : 'none');
        map.setPaintProperty('naip-imagery-layer', 'raster-opacity', basemapOpacity);
      }
    };
    if (map.isStyleLoaded()) applyBasemapState();
    else map.once('load', applyBasemapState);
  }, [basemap, basemapOpacity]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const applyRemoteState = () => {
      floodLayers.forEach((layer) => {
        remoteMapLayerIds[layer.id].forEach((mapLayerId) => {
          if (!map.getLayer(mapLayerId)) return;
          map.setLayoutProperty(mapLayerId, 'visibility', layer.enabled ? 'visible' : 'none');

          if (mapLayerId.includes('fill')) map.setPaintProperty(mapLayerId, 'fill-opacity', layer.opacity);
          if (mapLayerId.includes('outline')) map.setPaintProperty(mapLayerId, 'line-opacity', Math.min(1, layer.opacity + 0.32));
          if (mapLayerId.includes('points')) map.setPaintProperty(mapLayerId, 'circle-opacity', layer.opacity);
          if (mapLayerId.includes('halo')) map.setPaintProperty(mapLayerId, 'circle-opacity', Math.max(0.08, layer.opacity * 0.28));
          if (mapLayerId.includes('nwm-high-water')) map.setPaintProperty(mapLayerId, 'raster-opacity', layer.opacity);
          if (mapLayerId.startsWith('fema-') && mapLayerId.includes('raster')) {
            map.setPaintProperty(mapLayerId, 'raster-opacity', layer.opacity);
          }
        });
      });
    };

    if (map.isStyleLoaded()) applyRemoteState();
    else map.once('load', applyRemoteState);
  }, [floodLayers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const applyCommunityState = () => {
      communityLayers.forEach((layer) => {
        communityMapLayerIds[layer.id].forEach((mapLayerId) => {
          if (!map.getLayer(mapLayerId)) return;
          map.setLayoutProperty(mapLayerId, 'visibility', layer.enabled ? 'visible' : 'none');
          if (mapLayerId.includes('fill')) map.setPaintProperty(mapLayerId, 'fill-opacity', layer.opacity);
          if (mapLayerId.includes('outline')) map.setPaintProperty(mapLayerId, 'line-opacity', Math.min(1, layer.opacity + 0.2));
          if (mapLayerId.includes('points')) map.setPaintProperty(mapLayerId, 'circle-opacity', layer.opacity);
          if (mapLayerId.includes('halo')) map.setPaintProperty(mapLayerId, 'circle-opacity', Math.max(0.06, layer.opacity * 0.18));
        });
      });
    };

    if (map.isStyleLoaded()) applyCommunityState();
    else map.once('load', applyCommunityState);
  }, [communityLayers]);


  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fitBounds) return;
    map.fitBounds(
      [
        [fitBounds[0], fitBounds[1]],
        [fitBounds[2], fitBounds[3]],
      ],
      {
        padding: { top: 120, right: 100, bottom: 120, left: 100 },
        duration: 1000,
        pitch: 20,
      },
    );
  }, [fitBounds]);

  const visibleOfficialLayers = floodLayers.filter((layer) => layer.enabled);
  const visibleCommunityLayers = communityLayers.filter((layer) => layer.enabled);

  return (
    <main className="map-shell" aria-label="Interactive hazard map">
      <div ref={containerRef} className="map-container" />
      <div className="map-vignette" aria-hidden="true" />
      <div className="map-grid-overlay" aria-hidden="true" />

      <div className="map-search map-glass">
        <SearchIcon size={17} />
        <span>Search community, facility or river gauge</span>
        <kbd>⌘ K</kbd>
      </div>

      <section className="map-incident map-glass">
        <div className="map-incident-heading">
          <div className="radar-symbol">
            <RadarIcon size={20} />
          </div>
          <div>
            <span className="eyebrow">Flood intelligence workspace</span>
            <strong>{incidentName}</strong>
          </div>
          <span className="live-pill compact">
            <i /> Live
          </span>
        </div>
        <p>{incidentDescription}</p>
        <div className="incident-status-row">
          <span>
            <ClockIcon size={13} /> {timeLabels[selectedTime]}
          </span>
          <span>
            <MapPinIcon size={13} /> East Tennessee
          </span>
        </div>
      </section>

      <section className="map-metrics" aria-label="Map summary metrics">
        <article className="map-metric map-glass">
          <span className="metric-icon cyan">
            <ActivityIcon size={16} />
          </span>
          <div>
            <strong>{metrics.liveGauges}</strong>
            <span>Live gauges</span>
          </div>
        </article>

        <article className="map-metric map-glass">
          <span className="metric-icon green">
            <BuildingIcon size={16} />
          </span>
          <div>
            <strong>{metrics.femaAreas}</strong>
            <span>FEMA areas in view</span>
          </div>
        </article>
      </section>

      <div className="official-feed-status map-glass" aria-live="polite">
        <span className="feed-pulse" />
        <div>
          <strong>Official & public data feeds</strong>
          <span>{sourceMessage}</span>
          <span className="community-feed-line">{communityMessage}</span>
        </div>
      </div>

      <div className="map-legend map-glass">
        <div className="legend-title">
          <LayersIcon size={14} /> Map legend
        </div>
        <div className="legend-basemap">
          <span>Basemap</span>
          <strong>{basemapLabels[basemap]}</strong>
        </div>
        {visibleOfficialLayers.slice(0, 4).map((layer) => (
          <span key={layer.id} className="official-legend-row">
            <i className={`legend-official legend-official-${layer.category}`} />
            {layer.name}
          </span>
        ))}
        {visibleCommunityLayers.slice(0, 4).map((layer) => (
          <span key={layer.id} className="official-legend-row">
            <i className={`legend-official legend-community-${layer.category}`} />
            {layer.name}
          </span>
        ))}
        {visibleOfficialLayers.length + visibleCommunityLayers.length > 8 && (
          <span className="legend-more">+
            {visibleOfficialLayers.length + visibleCommunityLayers.length - 8} more layers
          </span>
        )}
      </div>

      <div className="map-timeline map-glass">
        <div className="timeline-label">
          <span>Observed</span>
          <strong>{timeLabels[selectedTime]}</strong>
          <span>Forecast</span>
        </div>
        <div className="timeline-track">
          <span className="timeline-progress" />
          <i className="timeline-marker" />
        </div>
      </div>
    </main>
  );
}
