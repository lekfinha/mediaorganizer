import React from 'react';
import { useAppStore } from '../../stores/useAppStore';
import './ProgressBar.css';

export const ProgressBar: React.FC = () => {
  const totalCount    = useAppStore(s => s.totalCount);
  const processedCount = useAppStore(s => s.processedCount);

  if (totalCount === 0) return null;

  // processed = items actioned so far (fixed denominator)
  // "current" position label = processedCount + 1 (what we're reviewing now)
  const reviewed   = processedCount + 1;
  const percentage = Math.min(100, (processedCount / totalCount) * 100);
  const remaining  = totalCount - processedCount;

  return (
    <div className="progress-container app-layout-bottombar">
      <div className="progress-text">
        <span className="progress-label">
          <span className="progress-current">{reviewed}</span>
          <span className="progress-sep"> / </span>
          <span className="progress-total">{totalCount}</span>
        </span>
        <span className="progress-remaining">{remaining} restantes</span>
        <span className="progress-pct">{Math.round(percentage)}%</span>
      </div>
      <div className="progress-bar-bg">
        <div
          className="progress-bar-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
