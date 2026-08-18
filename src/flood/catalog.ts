export type RemoteFloodLayerId =
  | 'fema_floodplain'
  | 'fema_floodway'
  | 'usgs_gauges'
  | 'noaa_observed'
  | 'noaa_forecast'
  | 'nwm_high_water';

export type FloodLayerCategory =
  | 'regulatory'
  | 'current'
  | 'forecast';

export interface RemoteFloodLayerState {
  id: RemoteFloodLayerId;
  category: FloodLayerCategory;
  name: string;
  description: string;
  source: string;
  enabled: boolean;
  opacity: number;
  badge: 'LIVE' | 'OFFICIAL';
}

export const initialFloodLayers: RemoteFloodLayerState[] = [
  {
    id: 'fema_floodplain',
    category: 'regulatory',
    name: 'FEMA Flood Hazard',
    description: 'Effective NFHL special and 0.2% annual-chance flood areas',
    source: 'FEMA NFHL',
    enabled: true,
    opacity: 0.28,
    badge: 'OFFICIAL',
  },
  {
    id: 'fema_floodway',
    category: 'regulatory',
    name: 'Regulatory Floodway',
    description: 'Floodway polygons from FEMA effective mapping',
    source: 'FEMA NFHL',
    enabled: false,
    opacity: 0.42,
    badge: 'OFFICIAL',
  },
  {
    id: 'usgs_gauges',
    category: 'current',
    name: 'USGS Stream Gauges',
    description: 'Near-real-time stage and discharge observations across Tennessee',
    source: 'USGS Water Services',
    enabled: true,
    opacity: 0.96,
    badge: 'LIVE',
  },
  {
    id: 'noaa_observed',
    category: 'current',
    name: 'NOAA Flood Status',
    description: 'Observed NWS river-stage status and flood-category thresholds',
    source: 'NOAA / NWS',
    enabled: true,
    opacity: 0.96,
    badge: 'LIVE',
  },
  {
    id: 'noaa_forecast',
    category: 'forecast',
    name: 'NWS 24 h River Forecast',
    description: 'Official river-stage forecast category for the next 24 hours',
    source: 'NOAA / NWS',
    enabled: false,
    opacity: 0.92,
    badge: 'LIVE',
  },
  {
    id: 'nwm_high_water',
    category: 'forecast',
    name: 'NWM 12 h High Water',
    description: 'National Water Model high-water probability and hotspot guidance',
    source: 'NOAA National Water Model',
    enabled: false,
    opacity: 0.66,
    badge: 'LIVE',
  },
];

export const floodCategoryLabels: Record<FloodLayerCategory, string> = {
  regulatory: 'Regulatory flood hazard',
  current: 'Current conditions',
  forecast: 'Forecast guidance',
};
