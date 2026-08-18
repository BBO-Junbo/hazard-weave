export type LayerId = 'flood' | 'vulnerability' | 'facilities' | 'incidents';
export type DataProviderName = 'mock' | 'blob' | 'external' | 'postgres';

export type Position = [number, number] | [number, number, number];

export interface PointGeometry {
  type: 'Point';
  coordinates: Position;
}

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: Position[][];
}

export interface GeoJsonFeature<G> {
  type: 'Feature';
  geometry: G;
  properties: Record<string, unknown> | null;
}

export interface FeatureCollection<G> {
  type: 'FeatureCollection';
  features: Array<GeoJsonFeature<G>>;
}

export interface LayerState {
  id: LayerId;
  name: string;
  description: string;
  enabled: boolean;
  opacity: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface SourceReference {
  name: string;
  validTime: string;
  modelVersion?: string;
}

export interface ResultRow {
  id: string;
  name: string;
  risk: 'High' | 'Moderate' | 'Low';
  exposedPopulation: number;
  primaryReason: string;
}

export interface MapAction {
  type: 'fit_bounds' | 'show_layer';
  bounds?: [number, number, number, number];
  layerId?: LayerId;
}

export interface AssistantResponse {
  answer: string;
  mapActions: MapAction[];
  rows: ResultRow[];
  sources: SourceReference[];
  confidence: 'High' | 'Moderate' | 'Low';
  provider?: ProviderDescriptor;
}

export interface DashboardMapData {
  floodZones: FeatureCollection<PolygonGeometry>;
  vulnerabilityAreas: FeatureCollection<PolygonGeometry>;
  facilities: FeatureCollection<PointGeometry>;
  incidents: FeatureCollection<PointGeometry>;
}

/**
 * Provider-neutral payload. This is the JSON shape stored in Blob/Postgres or
 * returned by an external API.
 */
export interface DashboardPayload {
  layers: LayerState[];
  map: DashboardMapData;
  rows: ResultRow[];
  sources: SourceReference[];
  incident: {
    id: string;
    name: string;
    description: string;
    validTime: string;
  };
}

export interface ProviderDescriptor {
  name: DataProviderName;
  label: string;
  mutable: boolean;
  source: string;
}

export interface DashboardResponse extends DashboardPayload {
  provider: ProviderDescriptor;
  generatedAt: string;
}

export interface ChatRequest {
  question: string;
  context?: {
    incidentId?: string;
    selectedTime?: string;
    selectedCounty?: string;
    visibleLayers?: LayerId[];
    mapBounds?: [number, number, number, number];
  };
}
