import React from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useAppStore } from '../../stores/useAppStore';
import { useConfigStore } from '../../stores/useConfigStore';
import './DirectoryPicker.css';

export const DirectoryPicker: React.FC = () => {
  const scanDirectory  = useAppStore(s => s.scanDirectory);
  const isLoading      = useAppStore(s => s.isLoading);
  const loadingMessage = useAppStore(s => s.loadingMessage);
  const config         = useConfigStore(s => s.config);

  const handleOpenFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Seleccionar directorio a organizar',
      });
      if (selected && typeof selected === 'string') {
        scanDirectory(selected);
      }
    } catch (e) {
      console.error('Failed to open directory', e);
    }
  };

  // Recent dirs = directories that have been scanned before (have a mapping entry)
  const recentDirs = Object.keys(config.directory_mappings || {}).slice(0, 8);

  return (
    <div className="directory-picker-container">
      {/* ── Loading overlay ── */}
      {isLoading && (
        <div className="picker-loading-overlay">
          <div className="picker-loading-card">
            <div className="picker-spinner" />
            <p className="picker-loading-msg">{loadingMessage || 'Cargando…'}</p>
          </div>
        </div>
      )}

      <div className="picker-card slide-in-up">
        <h1 className="picker-title gradient-text">MediaOrganizer</h1>
        <p className="picker-subtitle">Organiza tus archivos multimedia rápidamente.</p>

        <div className="drop-zone">
          <button
            className="btn btn-primary btn-lg"
            onClick={handleOpenFolder}
            disabled={isLoading}
          >
            📁 Abrir carpeta
          </button>
          <div className="mt-4 text-muted text-sm">
            Selecciona un directorio para comenzar
          </div>
        </div>

        {recentDirs.length > 0 && (
          <div className="recent-dirs">
            <div className="recent-title">Recientes</div>
            <div className="recent-list">
              {recentDirs.map(dir => (
                <button
                  key={dir}
                  className="recent-item"
                  onClick={() => scanDirectory(dir)}
                  disabled={isLoading}
                  title={dir}
                >
                  <span className="recent-icon">📂</span>
                  <span className="recent-path">{dir.split('/').pop() || dir}</span>
                  <span className="recent-fullpath">{dir}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
