import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../stores/useAppStore';
import './BrowsePanel.css';

interface SubDir {
  name: string;
  path: string;
  has_children: boolean;
}

// ── Recursive tree node ─────────────────────────────────────────────────────
interface DirNodeProps {
  dir: SubDir;
  depth: number;
  activePath: string;
  onSelect: (path: string) => void;
}

const DirNode: React.FC<DirNodeProps> = ({ dir, depth, activePath, onSelect }) => {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<SubDir[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);

  const isActive = dir.path === activePath;

  const handleToggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!expanded && children.length === 0 && dir.has_children) {
      setLoadingChildren(true);
      try {
        const result = await invoke<SubDir[]>('list_subdirs', { path: dir.path });
        setChildren(result);
      } catch (err) {
        console.error('list_subdirs error:', err);
      } finally {
        setLoadingChildren(false);
      }
    }
    setExpanded(prev => !prev);
  }, [expanded, children.length, dir.has_children, dir.path]);

  return (
    <div className="tree-node">
      <div
        className={`tree-node-row ${isActive ? 'tree-node-active' : ''}`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {/* Expand/collapse toggle */}
        {dir.has_children ? (
          <button className="tree-expand-btn" onClick={handleToggle} title={expanded ? 'Colapsar' : 'Expandir'}>
            {loadingChildren ? (
              <span className="tree-spinner" />
            ) : expanded ? (
              '▾'
            ) : (
              '▸'
            )}
          </button>
        ) : (
          <span className="tree-expand-spacer" />
        )}

        {/* Directory name — click to load */}
        <button
          className="tree-dir-btn"
          onClick={() => onSelect(dir.path)}
          title={dir.path}
        >
          <span className="tree-dir-icon">{isActive ? '📂' : '📁'}</span>
          <span className="tree-dir-name">{dir.name}</span>
        </button>
      </div>

      {/* Children — rendered when expanded */}
      {expanded && children.length > 0 && (
        <div className="tree-children">
          {children.map(child => (
            <DirNode
              key={child.path}
              dir={child}
              depth={depth + 1}
              activePath={activePath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main BrowsePanel ────────────────────────────────────────────────────────
export const BrowsePanel: React.FC = () => {
  const currentDir = useAppStore(s => s.currentDir);
  const currentIndex = useAppStore(s => s.currentIndex);
  const items = useAppStore(s => s.items);
  const scanDirectory = useAppStore(s => s.scanDirectory);

  const [rootDirs, setRootDirs] = useState<SubDir[]>([]);
  const [loadingRoot, setLoadingRoot] = useState(false);

  // Load top-level subdirs whenever currentDir changes
  useEffect(() => {
    if (!currentDir) return;
    setLoadingRoot(true);
    setRootDirs([]);
    invoke<SubDir[]>('list_subdirs', { path: currentDir })
      .then(setRootDirs)
      .catch(console.error)
      .finally(() => setLoadingRoot(false));
  }, [currentDir]);

  const parentDir = currentDir.split('/').slice(0, -1).join('/') || '/';
  const currentDirName = currentDir.split('/').pop() || currentDir;

  return (
    <aside className="browse-panel app-layout-sidebar">
      {/* ── Header ── */}
      <div className="browse-header">
        <button
          className="browse-parent-btn"
          onClick={() => scanDirectory(parentDir)}
          title={`Subir a ${parentDir}`}
          disabled={!parentDir || currentDir === '/'}
        >
          ⬆
        </button>
        <span className="browse-current-dir" title={currentDir}>
          📂 {currentDirName}
        </span>
      </div>

      {/* ── Post counter ── */}
      <div className="browse-counter">
        {items.length === 0 ? (
          <span className="browse-counter-empty">Sin posts</span>
        ) : (
          <>
            <span className="browse-counter-num">{currentIndex + 1}</span>
            <span className="browse-counter-sep">/</span>
            <span className="browse-counter-total">{items.length}</span>
            <span className="browse-counter-label">posts</span>
          </>
        )}
      </div>

      {/* ── Directory tree ── */}
      <div className="browse-tree">
        {loadingRoot && <div className="browse-tree-loading">Cargando…</div>}
        {!loadingRoot && rootDirs.length === 0 && (
          <div className="browse-tree-empty">Sin subcarpetas</div>
        )}
        {rootDirs.map(dir => (
          <DirNode
            key={dir.path}
            dir={dir}
            depth={0}
            activePath={currentDir}
            onSelect={scanDirectory}
          />
        ))}
      </div>

      {/* ── Footer hint ── */}
      <div className="browse-footer">
        <span className="browse-hint">↑↓ posts &nbsp;·&nbsp; ←→ carrusel</span>
      </div>
    </aside>
  );
};
