import React from 'react';
import { useAppStore } from '../../stores/useAppStore';
import './ModeSelector.css';

export const ModeSelector: React.FC = () => {
  const { mode, setMode } = useAppStore();

  return (
    <div className="mode-selector" data-mode={mode}>
      <div className="mode-slider" />
      <button 
        className={`mode-btn ${mode === 'binary' ? 'active' : ''}`}
        onClick={() => setMode('binary')}
      >
        ⚖️ Binary
      </button>
      <button 
        className={`mode-btn ${mode === 'classify' ? 'active' : ''}`}
        onClick={() => setMode('classify')}
      >
        🗂️ Classify
      </button>
    </div>
  );
};
