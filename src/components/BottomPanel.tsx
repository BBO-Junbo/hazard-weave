import type { ResultRow } from '../types';
import { ActivityIcon, AlertIcon, DownloadIcon, ShieldIcon, UsersIcon } from './Icons';

interface BottomPanelProps {
  rows: ResultRow[];
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

const riskScore = { High: 88, Moderate: 61, Low: 29 } as const;

export function BottomPanel({ rows }: BottomPanelProps) {
  const totalExposed = rows.reduce((sum, row) => sum + row.exposedPopulation, 0);
  const highPriority = rows.filter((row) => row.risk === 'High').length;

  const metrics = [
    { label: 'Communities analysed', value: rows.length, detail: 'Current map extent', icon: <ActivityIcon size={17} />, tone: 'cyan' },
    { label: 'High-priority areas', value: highPriority, detail: 'Human review required', icon: <AlertIcon size={17} />, tone: 'pink' },
    { label: 'Potentially exposed', value: formatNumber(totalExposed), detail: 'Illustrative population', icon: <UsersIcon size={17} />, tone: 'violet' },
    { label: 'System confidence', value: '82%', detail: '+4% from last run', icon: <ShieldIcon size={17} />, tone: 'green' },
  ];

  return (
    <section className="bottom-panel" aria-label="Analysis results">
      <div className="metric-grid">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <div className={`metric-card-icon ${metric.tone}`}>{metric.icon}</div>
            <div className="metric-card-copy">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.detail}</small>
            </div>
            <span className="metric-sparkline" aria-hidden="true"><i /><i /><i /><i /><i /></span>
          </article>
        ))}
      </div>

      <div className="result-table-wrap">
        <div className="table-heading">
          <div>
            <span className="eyebrow">Decision support</span>
            <h2>Priority communities</h2>
            <p>Ranked by combined hazard exposure and adaptive capacity.</p>
          </div>
          <button type="button" onClick={() => window.print()}><DownloadIcon size={15} /> Export snapshot</button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Community</th>
                <th>Priority index</th>
                <th>Status</th>
                <th>Exposed population</th>
                <th>Primary driver</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id}>
                  <td><span className="rank-number">{String(index + 1).padStart(2, '0')}</span></td>
                  <td><strong className="community-name">{row.name}</strong></td>
                  <td>
                    <div className="risk-score-cell">
                      <div className="risk-score-track"><span style={{ width: `${riskScore[row.risk]}%` }} /></div>
                      <b>{riskScore[row.risk]}</b>
                    </div>
                  </td>
                  <td><span className={`risk-badge risk-${row.risk.toLowerCase()}`}><i />{row.risk}</span></td>
                  <td>{formatNumber(row.exposedPopulation)}</td>
                  <td className="reason-cell">{row.primaryReason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
