import type { ProviderDescriptor } from '../types';
import { GlobeIcon, RadarIcon, RefreshIcon } from './Icons';

interface TopBarProps {
  lastUpdated: string;
  provider: ProviderDescriptor;
  refreshing: boolean;
  onRefresh: () => void;
}

export function TopBar({ lastUpdated, provider, refreshing, onRefresh }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand-group">
        <div className="brand-mark" aria-hidden="true">
          <RadarIcon size={22} />
          <span className="brand-pulse" />
        </div>
        <div>
          <div className="brand-row">
            <h1>HazardWeave</h1>
            <span className="prototype-badge">AI Operations</span>
          </div>
          <p>Unified disaster intelligence for East Tennessee</p>
        </div>
      </div>

      <nav className="topnav" aria-label="Primary navigation">
        <button className="topnav-item active" type="button">Overview</button>
        <button className="topnav-item" type="button">Intelligence</button>
        <button className="topnav-item" type="button">Operations</button>
      </nav>

      <div className="topbar-actions">
        <div className="system-status">
          <span className="status-dot" aria-hidden="true" />
          <div>
            <strong>{provider.label}</strong>
            <span>Synced {lastUpdated}</span>
          </div>
        </div>
        <button className="icon-button" type="button" aria-label="Refresh dashboard" onClick={onRefresh} disabled={refreshing}>
          <RefreshIcon className={refreshing ? 'spin' : undefined} />
        </button>
        <button className="region-button" type="button">
          <GlobeIcon size={17} />
          <span>ETDD</span>
        </button>
      </div>
    </header>
  );
}
