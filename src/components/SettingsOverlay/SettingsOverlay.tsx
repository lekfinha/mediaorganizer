import React from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useConfigStore } from '../../stores/useConfigStore';
import type { CollisionPolicy } from '../../types';
import './SettingsOverlay.css';

export const SettingsOverlay: React.FC = () => {
  const { isSettingsOpen, toggleSettings } = useAppStore();
  const { config, updateSettings } = useConfigStore();

  if (!isSettingsOpen) return null;

  const { global_settings } = config;

  return (
    <div className="modal-backdrop">
      <div className="settings-card slide-in-up">
        <div className="settings-header">
          <div className="settings-title">Settings</div>
          <button className="btn btn-ghost" onClick={toggleSettings}>✕</button>
        </div>
        
        <div className="settings-content">
          <section>
            <h3 className="settings-section-title">Global Settings</h3>
            
            <div className="setting-row">
              <div>
                <div className="setting-label">Prefetch Buffer Size</div>
                <div className="setting-desc">Number of items to load ahead</div>
              </div>
              <input 
                type="number" 
                className="input-base" 
                style={{ width: '80px' }}
                value={global_settings.prefetch_buffer_size}
                onChange={e => updateSettings({ prefetch_buffer_size: Number(e.target.value) })}
              />
            </div>

            <div className="setting-row">
              <div>
                <div className="setting-label">Heavy File Threshold (MB)</div>
                <div className="setting-desc">Files above this size won't be prefetched in bulk</div>
              </div>
              <input 
                type="number" 
                className="input-base" 
                style={{ width: '80px' }}
                value={global_settings.heavy_file_threshold_mb}
                onChange={e => updateSettings({ heavy_file_threshold_mb: Number(e.target.value) })}
              />
            </div>

            <div className="setting-row">
              <div>
                <div className="setting-label">Collision Policy</div>
                <div className="setting-desc">What to do when a file name already exists</div>
              </div>
              <select 
                className="select-base"
                value={global_settings.on_name_collision}
                onChange={e => updateSettings({ on_name_collision: e.target.value as CollisionPolicy })}
              >
                <option value="Prompt">Prompt</option>
                <option value="AutoRename">Auto Rename</option>
                <option value="Skip">Skip</option>
              </select>
            </div>
          </section>

          <section>
            <h3 className="settings-section-title">Profiles</h3>
            <div className="text-muted text-sm">
              Profile management coming soon. Currently using default shortcuts.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
