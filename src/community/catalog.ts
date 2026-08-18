export type RemoteCommunityLayerId =
  | 'cdc_svi'
  | 'acs_socioeconomic'
  | 'nfip_claims'
  | 'fema_ihp'
  | 'osm_resources';

export type CommunityLayerCategory =
  | 'socioeconomic'
  | 'insurance_assistance'
  | 'vgi';

export interface RemoteCommunityLayerState {
  id: RemoteCommunityLayerId;
  category: CommunityLayerCategory;
  name: string;
  description: string;
  source: string;
  enabled: boolean;
  opacity: number;
  badge: 'OFFICIAL' | 'API' | 'VGI';
}

export const initialCommunityLayers: RemoteCommunityLayerState[] = [
  {
    id: 'cdc_svi',
    category: 'socioeconomic',
    name: 'CDC Social Vulnerability Index',
    description: '2022 tract-level overall SVI and four vulnerability themes',
    source: 'CDC / ATSDR / GRASP',
    enabled: true,
    opacity: 0.46,
    badge: 'OFFICIAL',
  },
  {
    id: 'acs_socioeconomic',
    category: 'socioeconomic',
    name: 'ACS-derived Socioeconomic Indicators',
    description: '2018–2022 ACS-derived poverty, unemployment, insurance, housing burden and vehicle access by tract',
    source: 'CDC/ATSDR SVI using U.S. Census Bureau ACS 5-year',
    enabled: false,
    opacity: 0.42,
    badge: 'OFFICIAL',
  },
  {
    id: 'nfip_claims',
    category: 'insurance_assistance',
    name: 'NFIP Flood Claims',
    description: 'OpenFEMA claims grouped at FEMA approximate coordinates; zoom in for local detail',
    source: 'OpenFEMA NFIP Claims v3',
    enabled: false,
    opacity: 0.88,
    badge: 'API',
  },
  {
    id: 'fema_ihp',
    category: 'insurance_assistance',
    name: 'FEMA Individual Assistance',
    description: 'Aggregated RI-IHP registrations and awards by ZIP Code Tabulation Area',
    source: 'OpenFEMA RI-IHP v2',
    enabled: false,
    opacity: 0.44,
    badge: 'OFFICIAL',
  },
  {
    id: 'osm_resources',
    category: 'vgi',
    name: 'OSM Community Resources',
    description: 'Volunteer-mapped hospitals, shelters, clinics, public safety and social facilities',
    source: 'OpenStreetMap / Overpass',
    enabled: false,
    opacity: 0.92,
    badge: 'VGI',
  },
];

export const communityCategoryLabels: Record<CommunityLayerCategory, string> = {
  socioeconomic: 'Socioeconomic and vulnerability indicators',
  insurance_assistance: 'Insurance and assistance information',
  vgi: 'Volunteered geographic information',
};
