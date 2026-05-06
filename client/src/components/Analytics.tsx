import { useState, useEffect } from 'react';
import type { Analytics } from '../types';
import { fetchAnalytics } from '../api';

export default function Analytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics()
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-container">
        <div className="error-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const imagePercentage = data.fileCount > 0 ? (data.imageCount / data.fileCount) * 100 : 0;
  const maxTypeCount = Math.max(...data.typeDistribution.map((t) => t.count), 1);

  return (
    <div className="analytics-container">
      <h2>Storage Analytics</h2>

      <div className="analytics-grid">
        <div className="stat-card">
          <div className="stat-icon storage-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <span className="stat-value">{data.totalSizeFormatted}</span>
          <span className="stat-label">Total Storage</span>
        </div>

        <div className="stat-card">
          <div className="stat-icon files-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <span className="stat-value">{data.fileCount}</span>
          <span className="stat-label">Total Files</span>
        </div>

        <div className="stat-card">
          <div className="stat-icon images-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <span className="stat-value">{data.imageCount}</span>
          <span className="stat-label">Images</span>
        </div>

        <div className="stat-card">
          <div className="stat-icon videos-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <span className="stat-value">{data.videoCount}</span>
          <span className="stat-label">Videos</span>
        </div>

        <div className="stat-card">
          <div className="stat-icon folders-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span className="stat-value">{data.folderCount}</span>
          <span className="stat-label">Folders</span>
        </div>

        <div className="stat-card">
          <div className="stat-icon recent-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <span className="stat-value">{data.recentActivity.newCount}</span>
          <span className="stat-label">New (7 days)</span>
          <span className="stat-sub">{data.recentActivity.newSizeFormatted}</span>
        </div>
      </div>

      <div className="analytics-charts">
        <div className="chart-card">
          <h3>File Distribution</h3>
          <div className="distribution-chart">
            <div className="progress-segmented">
              <div
                className="progress-segment images-segment"
                style={{ width: `${imagePercentage}%` }}
                title={`Images: ${data.imageCount}`}
              />
              {data.otherCount > 0 && (
                <div
                  className="progress-segment other-segment"
                  style={{ width: `${100 - imagePercentage}%` }}
                  title={`Other: ${data.otherCount}`}
                />
              )}
            </div>
            <div className="progress-legend">
              <div className="legend-item">
                <span className="legend-dot images-dot" />
                <span>Images ({data.imageCount})</span>
              </div>
              {data.otherCount > 0 && (
                <div className="legend-item">
                  <span className="legend-dot other-dot" />
                  <span>Other ({data.otherCount})</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="chart-card">
          <h3>File Types Breakdown</h3>
          <div className="types-chart">
            {data.typeDistribution.map((item) => (
              <div key={item.type} className="type-bar">
                <span className="type-label">{item.type}</span>
                <div className="type-bar-track">
                  <div
                    className="type-bar-fill"
                    style={{ width: `${(item.count / maxTypeCount) * 100}%` }}
                  />
                </div>
                <span className="type-count">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
