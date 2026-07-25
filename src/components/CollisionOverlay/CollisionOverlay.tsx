import React, { useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import './CollisionOverlay.css';

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const CollisionOverlay: React.FC = () => {
  const { isCollisionOverlayOpen, pendingCollision, resolveCollision } = useAppStore();
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState('');

  if (!isCollisionOverlayOpen || !pendingCollision || pendingCollision.length === 0) return null;

  const handleManualSubmit = () => {
    if (manualName.trim()) {
      resolveCollision({ type: 'ManualRename', new_name: manualName.trim() });
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="collision-card slide-in-up">
        <h2 className="collision-title">⚠️ File Name Collision</h2>
        
        <div className="collision-info">
          {pendingCollision.map((c, i) => (
            <div key={i} className="mb-4 last:mb-0">
              <div className="collision-file">
                <span className="collision-label">Moving:</span> 
                {c.source_file.split('/').pop()} ({formatBytes(c.source_size)})
              </div>
              <div className="collision-file">
                <span className="collision-label">Existing:</span> 
                {c.existing_file.split('/').pop()} ({formatBytes(c.existing_size)})
              </div>
            </div>
          ))}
        </div>

        <div className="collision-actions">
          {!showManual ? (
            <>
              <button 
                className="btn btn-primary"
                onClick={() => resolveCollision({ type: 'AutoRename' })}
              >
                Auto Rename (append numbers)
              </button>
              <button 
                className="btn"
                style={{ background: 'var(--bg-elevated)' }}
                onClick={() => setShowManual(true)}
              >
                Rename Manually
              </button>
              <button 
                className="btn btn-ghost"
                onClick={() => resolveCollision({ type: 'Cancel' })}
              >
                Cancel Move
              </button>
            </>
          ) : (
            <div className="manual-rename-container">
              <input 
                type="text" 
                className="input-base"
                placeholder="Enter new base name"
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
                autoFocus
              />
              <button className="btn btn-primary" onClick={handleManualSubmit}>Save</button>
              <button className="btn btn-ghost" onClick={() => setShowManual(false)}>Back</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
