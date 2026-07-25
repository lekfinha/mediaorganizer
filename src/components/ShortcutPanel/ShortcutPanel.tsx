import React, { useState, useEffect, useRef } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useAppStore } from '../../stores/useAppStore';
import { useConfigStore } from '../../stores/useConfigStore';
import './ShortcutPanel.css';

// ── Add-shortcut form (inline, at the bottom of the list) ──────────────────
interface AddShortcutFormProps {
  onAdd: (key: string, dest: string) => void;
  onCancel: () => void;
  usedKeys: string[];
  currentDir: string;
}

const AddShortcutForm: React.FC<AddShortcutFormProps> = ({ onAdd, onCancel, usedKeys, currentDir }) => {
  const [capturedKey, setCapturedKey] = useState<string>('');
  const [dest, setDest] = useState('');
  const [error, setError] = useState('');
  const [listeningKey, setListeningKey] = useState(false);
  const [pickingDir, setPickingDir] = useState(false);
  const destRef = useRef<HTMLInputElement>(null);

  const handlePickDir = async () => {
    setPickingDir(true);
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Seleccionar directorio destino',
        defaultPath: currentDir || undefined,
      });
      if (selected && typeof selected === 'string') {
        setDest(selected);
        setError('');
        setTimeout(() => destRef.current?.focus(), 50);
      }
    } catch (e) {
      console.error('Directory picker error:', e);
    } finally {
      setPickingDir(false);
    }
  };

  // Capture the next key press when in listening mode
  useEffect(() => {
    if (!listeningKey) return;
    const handler = (e: KeyboardEvent) => {
      e.stopPropagation();
      e.preventDefault();
      // Ignore modifier-only keys
      if (['Control', 'Shift', 'Alt', 'Meta', 'Tab', 'Escape'].includes(e.key)) {
        if (e.key === 'Escape') { setListeningKey(false); }
        return;
      }
      setCapturedKey(e.key);
      setListeningKey(false);
      setError('');
      // Focus the directory input after capturing key
      setTimeout(() => destRef.current?.focus(), 50);
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [listeningKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!capturedKey) { setError('Captura una tecla primero'); return; }
    if (!dest.trim()) { setError('Escribe el directorio destino'); return; }
    if (usedKeys.includes(capturedKey)) {
      setError(`La tecla "${capturedKey.toUpperCase()}" ya está asignada`);
      return;
    }
    onAdd(capturedKey, dest.trim());
  };

  return (
    <form className="add-shortcut-form" onSubmit={handleSubmit}>
      <div className="add-shortcut-row">
        {/* Key capture button */}
        <button
          type="button"
          className={`key-capture-btn ${listeningKey ? 'listening' : ''} ${capturedKey ? 'captured' : ''}`}
          onClick={() => { setCapturedKey(''); setListeningKey(true); }}
          title="Click y luego presiona la tecla"
        >
          {listeningKey ? '…' : capturedKey ? capturedKey.toUpperCase() : 'TECLA'}
        </button>

        <span className="add-shortcut-arrow">→</span>

        {/* Directory destination input + folder picker */}
        <div className="add-shortcut-dest-row">
          <input
            ref={destRef}
            className="add-shortcut-dest"
            type="text"
            placeholder="subdir o /ruta/absoluta"
            value={dest}
            onChange={e => { setDest(e.target.value); setError(''); }}
            onKeyDown={e => { if (e.key === 'Escape') onCancel(); }}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            className={`folder-pick-btn ${pickingDir ? 'loading' : ''}`}
            onClick={handlePickDir}
            title="Explorar carpeta…"
            disabled={pickingDir}
          >
            {pickingDir ? '⏳' : '📂'}
          </button>
        </div>
      </div>

      {error && <p className="add-shortcut-error">{error}</p>}

      <div className="add-shortcut-actions">
        <button type="button" className="btn btn-ghost add-shortcut-cancel" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary add-shortcut-save">
          Guardar
        </button>
      </div>
    </form>
  );
};

// ── Main ShortcutPanel ─────────────────────────────────────────────────────
export const ShortcutPanel: React.FC = () => {
  const { mode, currentDir, moveCurrentItem, deleteCurrentItem, advance, toggleSettings } = useAppStore();
  const getActiveShortcuts = useConfigStore(s => s.getActiveShortcuts);
  const setDirectoryShortcut = useConfigStore(s => s.setDirectoryShortcut);
  const removeDirectoryShortcut = useConfigStore(s => s.removeDirectoryShortcut);

  const shortcuts = getActiveShortcuts(currentDir);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  // Flash animation on key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setActiveKey(e.key);
      setTimeout(() => setActiveKey(null), 150);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAdd = (key: string, dest: string) => {
    setDirectoryShortcut(currentDir, key, dest);
    setShowAddForm(false);
  };

  const handleRemove = (key: string) => {
    removeDirectoryShortcut(currentDir, key);
  };

  return (
    <div className="shortcut-panel app-layout-sidebar">
      {mode === 'binary' ? (
        <div className="binary-actions">
          <button
            className={`btn btn-danger binary-btn ${activeKey === 'ArrowLeft' ? 'active' : ''}`}
            onClick={() => deleteCurrentItem()}
          >
            ← Eliminar
          </button>
          <button
            className={`btn btn-primary binary-btn ${activeKey === 'ArrowRight' ? 'active' : ''}`}
            onClick={() => advance()}
          >
            Mantener →
          </button>
        </div>
      ) : (
        <div className="classify-panel">
          <div className="shortcut-panel-header">
            <span>Shortcuts</span>
            <span className="shortcut-count">{Object.keys(shortcuts).length}</span>
          </div>

          <div className="shortcut-list">
            {Object.entries(shortcuts).map(([key, dest]) => (
              <div
                key={key}
                className={`shortcut-item ${activeKey === key ? 'active' : ''}`}
                onMouseEnter={() => setHoverKey(key)}
                onMouseLeave={() => setHoverKey(null)}
              >
                {/* Click on main area → move item */}
                <div className="shortcut-item-main" onClick={() => moveCurrentItem(dest)}>
                  <span className="shortcut-key">{key.toUpperCase()}</span>
                  <span className="shortcut-dest" title={dest}>
                    📁 {dest.split('/').pop() || dest}
                  </span>
                </div>

                {/* Delete shortcut button (shows on hover) */}
                <button
                  className={`shortcut-delete-btn ${hoverKey === key ? 'visible' : ''}`}
                  onClick={(e) => { e.stopPropagation(); handleRemove(key); }}
                  title="Eliminar shortcut"
                >
                  ×
                </button>
              </div>
            ))}

            {Object.keys(shortcuts).length === 0 && !showAddForm && (
              <div className="shortcut-empty">
                <span>Sin shortcuts</span>
                <span className="shortcut-empty-sub">Usa el botón + para agregar</span>
              </div>
            )}
          </div>

          {/* ── Inline add form ── */}
          {showAddForm ? (
            <AddShortcutForm
              onAdd={handleAdd}
              onCancel={() => setShowAddForm(false)}
              usedKeys={Object.keys(shortcuts)}
              currentDir={currentDir}
            />
          ) : (
            <button
              className="btn add-shortcut-btn"
              onClick={() => setShowAddForm(true)}
              disabled={!currentDir}
              title={!currentDir ? 'Abre un directorio primero' : 'Agregar shortcut'}
            >
              <span className="add-shortcut-plus">＋</span>
              Agregar shortcut
            </button>
          )}
        </div>
      )}

      <div className="panel-footer">
        <span className="mode-indicator">{mode === 'binary' ? 'Modo Binario' : 'Modo Clasificar'}</span>
        <button className="btn btn-ghost" onClick={toggleSettings} title="Settings">
          ⚙️
        </button>
      </div>
    </div>
  );
};
