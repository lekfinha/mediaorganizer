import React, { useState } from 'react';
import './CaptionPanel.css';

interface CaptionPanelProps {
  caption: string;
  isLoading: boolean;
}

export const CaptionPanel: React.FC<CaptionPanelProps> = ({ caption, isLoading }) => {
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="caption-panel caption-panel--loading">
        <span className="caption-icon">💬</span>
        <span className="caption-loading-dots">
          <span /><span /><span />
        </span>
      </div>
    );
  }

  if (!caption) return null;

  // Truncate preview to first 120 chars
  const preview = caption.length > 120 ? caption.slice(0, 120).trimEnd() + '…' : caption;
  const needsExpand = caption.length > 120;

  return (
    <div
      className={`caption-panel glass ${expanded ? 'caption-panel--expanded' : ''}`}
      onClick={() => needsExpand && setExpanded(e => !e)}
      role={needsExpand ? 'button' : undefined}
      title={needsExpand ? (expanded ? 'Colapsar' : 'Ver completo') : undefined}
    >
      <span className="caption-icon">💬</span>
      <p className="caption-text">{expanded ? caption : preview}</p>
      {needsExpand && (
        <span className="caption-toggle">{expanded ? '▲' : '▼'}</span>
      )}
    </div>
  );
};
