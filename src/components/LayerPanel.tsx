import type { ReactNode } from 'react';
import type {
  RemoteCommunityLayerId,
  RemoteCommunityLayerState,
} from '../community/catalog';
import type {
  RemoteFloodLayerId,
  RemoteFloodLayerState,
} from '../flood/catalog';
import type { BasemapId } from '../types';
import {
  ActivityIcon,
  ChevronDownIcon,
  ClockIcon,
  DatabaseIcon,
  GlobeIcon,
  LayersIcon,
  MapPinIcon,
  RadarIcon,
  ShieldIcon,
  UsersIcon,
} from './Icons';

interface LayerPanelProps {
  floodLayers: RemoteFloodLayerState[];
  communityLayers: RemoteCommunityLayerState[];
  selectedTime: string;
  selectedCounty: string;
  basemap: BasemapId;
  basemapOpacity: number;
  onFloodToggle: (id: RemoteFloodLayerId) => void;
  onFloodOpacityChange: (id: RemoteFloodLayerId, opacity: number) => void;
  onCommunityToggle: (id: RemoteCommunityLayerId) => void;
  onCommunityOpacityChange: (id: RemoteCommunityLayerId, opacity: number) => void;
  onTimeChange: (value: string) => void;
  onCountyChange: (value: string) => void;
  onBasemapChange: (value: BasemapId) => void;
  onBasemapOpacityChange: (opacity: number) => void;
}

interface BasemapOption {
  id: BasemapId;
  name: string;
  description: string;
  previewClassName: string;
}

const basemapOptions: BasemapOption[] = [
  {
    id: 'dark',
    name: 'Dark Reference',
    description: 'Global streets and labels; fallback outside imagery coverage',
    previewClassName: 'basemap-preview-dark',
  },
  {
    id: 'tdot',
    name: 'TDOT Imagery',
    description: 'Tennessee Department of Transportation aerial imagery',
    previewClassName: 'basemap-preview-tdot',
  },
  {
    id: 'naip',
    name: 'USDA NAIP',
    description: 'National Agriculture Imagery Program aerial mosaic',
    previewClassName: 'basemap-preview-naip',
  },
];

function RemoteLayerCard({
  layer,
  dotClass,
  onToggle,
  onOpacityChange,
}: {
  layer: RemoteFloodLayerState | RemoteCommunityLayerState;
  dotClass: string;
  onToggle: () => void;
  onOpacityChange: (value: number) => void;
}) {
  return (
    <article className={`remote-layer-card ${layer.enabled ? 'enabled' : ''}`}>
      <div className="remote-layer-top">
        <button
          type="button"
          className={`remote-layer-dot ${dotClass}`}
          aria-pressed={layer.enabled}
          aria-label={`Toggle ${layer.name}`}
          onClick={onToggle}
        >
          <span />
        </button>

        <button type="button" className="remote-layer-copy" onClick={onToggle}>
          <span className="remote-layer-heading">
            <strong>{layer.name}</strong>
            <em
              className={`remote-source-badge badge-${layer.badge
                .toLowerCase()
                .replaceAll(' ', '-')}`}
            >
              {layer.badge}
            </em>
          </span>
          <small>{layer.description}</small>
          <span className="remote-provider">{layer.source}</span>
        </button>

        <label className="switch-control">
          <input type="checkbox" checked={layer.enabled} onChange={onToggle} />
          <span aria-hidden="true" />
          <span className="sr-only">Toggle {layer.name}</span>
        </label>
      </div>

      <div className="opacity-control compact-opacity">
        <span>Opacity</span>
        <input
          type="range"
          min="0.08"
          max="1"
          step="0.04"
          value={layer.opacity}
          disabled={!layer.enabled}
          onChange={(event) => onOpacityChange(Number(event.target.value))}
        />
        <output>{Math.round(layer.opacity * 100)}%</output>
      </div>
    </article>
  );
}

function DataAccordion({
  icon,
  title,
  subtitle,
  status,
  defaultOpen = false,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  status?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="data-accordion" open={defaultOpen}>
      <summary>
        <span className="data-accordion-icon">{icon}</span>
        <span className="data-accordion-copy">
          <strong>{title}</strong>
          <small>{subtitle}</small>
        </span>
        {status && <span className="data-accordion-status">{status}</span>}
        <span className="data-accordion-chevron" aria-hidden="true">
          <ChevronDownIcon size={14} />
        </span>
      </summary>
      <div className="data-accordion-body">{children}</div>
    </details>
  );
}

export function LayerPanel({
  floodLayers,
  communityLayers,
  selectedTime,
  selectedCounty,
  basemap,
  basemapOpacity,
  onFloodToggle,
  onFloodOpacityChange,
  onCommunityToggle,
  onCommunityOpacityChange,
  onTimeChange,
  onCountyChange,
  onBasemapChange,
  onBasemapOpacityChange,
}: LayerPanelProps) {
  const socioeconomicLayers = communityLayers.filter(
    (layer) => layer.category === 'socioeconomic',
  );
  const insuranceLayers = communityLayers.filter(
    (layer) => layer.category === 'insurance_assistance',
  );
  const vgiLayers = communityLayers.filter((layer) => layer.category === 'vgi');

  return (
    <aside className="side-panel layer-panel" aria-label="Map controls">
      <section className="incident-brief">
        <div className="incident-brief-top">
          <span className="live-pill">
            <i /> Live operation
          </span>
          <span className="incident-code">HW–ETN</span>
        </div>
        <h2>East Tennessee Flood Pilot</h2>
        <p>Multisource geospatial evidence for hazard monitoring and community decision support.</p>
        <div className="incident-meta">
          <span>
            <MapPinIcon size={14} /> ETDD Region
          </span>
          <span>
            <ClockIcon size={14} /> Active
          </span>
        </div>
      </section>

      <section className="control-section">
        <div className="section-title">
          <span>
            <ClockIcon size={16} />
          </span>
          <div>
            <h3>Analysis window</h3>
            <p>Choose the operational horizon</p>
          </div>
        </div>

        <div className="segmented-control" role="group" aria-label="Analysis time">
          {[
            ['now', 'Now'],
            ['6h', '+6h'],
            ['12h', '+12h'],
            ['24h', '+24h'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={selectedTime === value ? 'active' : ''}
              onClick={() => onTimeChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="control-section data-catalog-section">
        <div className="section-title section-title-row">
          <div className="section-title-main">
            <span>
              <DatabaseIcon size={16} />
            </span>
            <div>
              <h3>Data catalog</h3>
              <p>Six proposal-aligned evidence categories</p>
            </div>
          </div>
          <span className="public-source-chip">LIVE + PUBLIC</span>
        </div>

        <div className="data-accordion-list">
          <DataAccordion
            icon={<LayersIcon size={16} />}
            title="Remote sensing and aerial imagery"
            subtitle="TDOT aerial imagery, USDA NAIP and reference basemap"
            status="3 sources"
            defaultOpen
          >
            <div className="basemap-selector" role="radiogroup" aria-label="Basemap selection">
              {basemapOptions.map((option) => (
                <label
                  key={option.id}
                  className={`basemap-option ${basemap === option.id ? 'active' : ''}`}
                >
                  <input
                    type="radio"
                    name="basemap"
                    value={option.id}
                    checked={basemap === option.id}
                    onChange={() => onBasemapChange(option.id)}
                  />

                  <span
                    className={`basemap-preview ${option.previewClassName}`}
                    aria-hidden="true"
                  >
                    <i />
                  </span>

                  <span className="basemap-copy">
                    <strong>{option.name}</strong>
                    <small>{option.description}</small>
                  </span>

                  <span className="basemap-radio-indicator" aria-hidden="true" />
                </label>
              ))}
            </div>

            {basemap !== 'dark' && (
              <label className="basemap-opacity">
                <span>Imagery opacity</span>
                <input
                  type="range"
                  min="0.2"
                  max="1"
                  step="0.05"
                  value={basemapOpacity}
                  onChange={(event) =>
                    onBasemapOpacityChange(Number(event.target.value))
                  }
                />
                <output>{Math.round(basemapOpacity * 100)}%</output>
              </label>
            )}
          </DataAccordion>

          <DataAccordion
            icon={<RadarIcon size={16} />}
            title="Climate and hydrologic signals"
            subtitle="Regulatory flood hazard, observations and forecast guidance"
            status={`${floodLayers.length} layers`}
            defaultOpen
          >
            <div className="flood-layer-list">
              {floodLayers.map((layer) => (
                <RemoteLayerCard
                  key={layer.id}
                  layer={layer}
                  dotClass={`remote-layer-dot-${layer.category}`}
                  onToggle={() => onFloodToggle(layer.id)}
                  onOpacityChange={(value) => onFloodOpacityChange(layer.id, value)}
                />
              ))}
            </div>
          </DataAccordion>

          <DataAccordion
            icon={<GlobeIcon size={16} />}
            title="Volunteered geographic information (VGI)"
            subtitle="Volunteer-mapped community resources and infrastructure"
            status={`${vgiLayers.length} layer`}
          >
            <div className="flood-layer-list">
              {vgiLayers.map((layer) => (
                <RemoteLayerCard
                  key={layer.id}
                  layer={layer}
                  dotClass="remote-layer-dot-vgi"
                  onToggle={() => onCommunityToggle(layer.id)}
                  onOpacityChange={(value) => onCommunityOpacityChange(layer.id, value)}
                />
              ))}
            </div>
          </DataAccordion>

          <DataAccordion
            icon={<UsersIcon size={16} />}
            title="Help requests"
            subtitle="Resident needs, 211/311 requests and partner operational feeds"
            status="Partner feed"
          >
            <article className="partner-source-card">
              <div className="partner-source-icon">
                <UsersIcon size={16} />
              </div>
              <div>
                <strong>211 / 311 Help Requests</strong>
                <p>
                  No statewide machine-readable public help-request feed is connected. This slot is reserved for de-identified ETDD, Tennessee 211 or local 311 partner data.
                </p>
                <span>Connection required · no synthetic requests shown</span>
              </div>
            </article>
          </DataAccordion>

          <DataAccordion
            icon={<DatabaseIcon size={16} />}
            title="Insurance and assistance information"
            subtitle="Flood claims and federal individual assistance"
            status={`${insuranceLayers.length} layers`}
          >
            <div className="flood-layer-list">
              {insuranceLayers.map((layer) => (
                <RemoteLayerCard
                  key={layer.id}
                  layer={layer}
                  dotClass="remote-layer-dot-insurance-assistance"
                  onToggle={() => onCommunityToggle(layer.id)}
                  onOpacityChange={(value) => onCommunityOpacityChange(layer.id, value)}
                />
              ))}
            </div>
          </DataAccordion>

          <DataAccordion
            icon={<ShieldIcon size={16} />}
            title="Socioeconomic and vulnerability indicators"
            subtitle="Tract-level social vulnerability and ACS-derived indicators"
            status={`${socioeconomicLayers.length} layers`}
          >
            <div className="flood-layer-list">
              {socioeconomicLayers.map((layer) => (
                <RemoteLayerCard
                  key={layer.id}
                  layer={layer}
                  dotClass="remote-layer-dot-socioeconomic"
                  onToggle={() => onCommunityToggle(layer.id)}
                  onOpacityChange={(value) => onCommunityOpacityChange(layer.id, value)}
                />
              ))}
            </div>
          </DataAccordion>
        </div>
      </section>

      <section className="control-section area-section">
        <div className="section-title">
          <span>
            <MapPinIcon size={16} />
          </span>
          <div>
            <h3>Area of interest</h3>
            <p>Filter the current workspace</p>
          </div>
        </div>

        <label className="select-field" htmlFor="county">
          <span>County</span>
          <select
            id="county"
            value={selectedCounty}
            onChange={(event) => onCountyChange(event.target.value)}
          >
            <option value="all">All pilot counties</option>
            <option value="knox">Knox County</option>
            <option value="anderson">Anderson County</option>
            <option value="blount">Blount County</option>
            <option value="cocke">Cocke County</option>
            <option value="sevier">Sevier County</option>
            <option value="greene">Greene County</option>
            <option value="washington">Washington County</option>
          </select>
        </label>
      </section>

      <section className="data-health">
        <div className="data-health-header">
          <span>
            <ActivityIcon size={16} />
          </span>
          <strong>Data health</strong>
          <span className="health-score">LIVE</span>
        </div>
        <div className="health-track">
          <span />
        </div>
        <p>TDOT · USDA · FEMA · USGS · NOAA/NWS · CDC · OpenFEMA · OSM</p>
      </section>
    </aside>
  );
}
