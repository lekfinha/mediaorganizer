import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { usePrefetchStore } from '../../stores/usePrefetchStore';
import { ImageViewer } from './ImageViewer';
import { VideoPlayer } from './VideoPlayer';
import './MediaViewer.css';

const VIEWABLE_MIME_PREFIXES = ['image/', 'video/'];

function isViewable(mimeType: string): boolean {
  return VIEWABLE_MIME_PREFIXES.some(prefix => mimeType.startsWith(prefix));
}

export const MediaViewer: React.FC = () => {
  const currentItem = useAppStore(s => s.getCurrentItem());
  const getMedia = usePrefetchStore(s => s.getMedia);
  const [subIndex, setSubIndex] = useState(0);

  useEffect(() => {
    setSubIndex(0);
  }, [currentItem?.id]);

  if (!currentItem) {
    return (
      <div className="media-viewer-container media-viewer-empty">
        <span className="media-viewer-empty-icon">📁</span>
        <p>No hay archivos para mostrar</p>
      </div>
    );
  }

  const media = getMedia(currentItem.id);

  // Filter to only viewable (image/video) files from this DisplayItem
  const viewableFiles = currentItem.files
    .map((f, originalIndex) => ({ file: f, originalIndex }))
    .filter(({ file }) => isViewable(file.mime_type));

  // If no viewable files at all, show a placeholder
  if (viewableFiles.length === 0) {
    return (
      <div className="media-viewer-container media-viewer-empty">
        <span className="media-viewer-empty-icon">📄</span>
        <p>{currentItem.base_name}</p>
        <p className="media-viewer-empty-sub">No hay contenido visual</p>
      </div>
    );
  }

  // Clamp subIndex to the viewable array
  const safeSubIndex = Math.min(subIndex, viewableFiles.length - 1);
  const { file: currentFile, originalIndex } = viewableFiles[safeSubIndex];

  // Get asset URL from prefetch buffer (indexed by original file index)
  const allUrls = media?.assetUrls || [];
  const currentUrl = allUrls[originalIndex];

  // If still loading (not yet in buffer), show loading state
  if (!currentUrl) {
    return (
      <div className="media-viewer-container media-viewer-empty">
        <div className="media-viewer-spinner" />
        <p>Cargando…</p>
      </div>
    );
  }

  const isVideo = currentFile.mime_type.startsWith('video/');

  const handlePrev = () =>
    setSubIndex(s => (s > 0 ? s - 1 : viewableFiles.length - 1));
  const handleNext = () =>
    setSubIndex(s => (s < viewableFiles.length - 1 ? s + 1 : 0));

  return (
    <div className="media-viewer-container app-layout-viewer">
      {isVideo ? (
        <VideoPlayer key={currentUrl} src={currentUrl} />
      ) : (
        <ImageViewer key={currentUrl} src={currentUrl} />
      )}

      {/* Multi-file navigation: only shown when >1 viewable file in the group */}
      {viewableFiles.length > 1 && (
        <>
          <button className="media-nav media-nav-prev" onClick={handlePrev}>‹</button>
          <button className="media-nav media-nav-next" onClick={handleNext}>›</button>
          <div className="media-dots">
            {viewableFiles.map((_, i) => (
              <button
                key={i}
                className={`media-dot ${i === safeSubIndex ? 'active' : ''}`}
                onClick={() => setSubIndex(i)}
              />
            ))}
          </div>
        </>
      )}

      {/* File type badge */}
      <div className="media-type-badge">
        {isVideo ? '🎬' : '🖼️'} {currentFile.extension.toUpperCase()}
        {viewableFiles.length > 1 && (
          <span className="media-type-count"> {safeSubIndex + 1}/{viewableFiles.length}</span>
        )}
      </div>
    </div>
  );
};
