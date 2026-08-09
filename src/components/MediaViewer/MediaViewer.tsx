import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { usePrefetchStore } from '../../stores/usePrefetchStore';
import type { FileEntry } from '../../types';
import { ImageViewer } from './ImageViewer';
import { VideoPlayer } from './VideoPlayer';
import { CaptionPanel } from '../CaptionPanel/CaptionPanel';
import { useCaption } from '../../hooks/useCaption';
import './MediaViewer.css';

const VIEWABLE_MIME_PREFIXES = ['image/', 'video/'];

function isViewable(mimeType: string): boolean {
  return VIEWABLE_MIME_PREFIXES.some(prefix => mimeType.startsWith(prefix));
}

export const MediaViewer: React.FC = () => {
  const currentItem = useAppStore(s => s.getCurrentItem());
  const mode = useAppStore(s => s.mode);
  const storeCarouselIndex = useAppStore(s => s.carouselIndex);
  const setCarouselLength = useAppStore(s => s.setCarouselLength);
  const getMedia = usePrefetchStore(s => s.getMedia);
  const [subIndex, setSubIndex] = useState(0);
  const { caption, isLoading: captionLoading } = useCaption(currentItem ?? null);

  // Reset local sub-index when item changes
  useEffect(() => {
    setSubIndex(0);
  }, [currentItem?.id]);

  // Pre-compute viewable files so we can always sync length to the store
  // (needed for keyboard carousel control in browse mode).
  const allViewable = (currentItem?.files ?? []).reduce<{ file: FileEntry; originalIndex: number }[]>((acc, f, i) => {
    if (isViewable(f.mime_type)) acc.push({ file: f, originalIndex: i });
    return acc;
  }, []);

  // Keep the store in sync with how many carousel items are visible
  useEffect(() => {
    setCarouselLength(allViewable.length);
  }, [allViewable.length, setCarouselLength]);

  if (!currentItem) {
    return (
      <div className="media-viewer-container media-viewer-empty">
        <span className="media-viewer-empty-icon">📁</span>
        <p>No hay archivos para mostrar</p>
      </div>
    );
  }

  const media = getMedia(currentItem.id);

  // allViewable was computed above (before early returns) — reuse it
  const viewableFiles = allViewable;

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

  // In browse mode the keyboard handler drives the carousel via the store;
  // in other modes use the local subIndex state.
  const effectiveIndex = mode === 'browse' ? storeCarouselIndex : subIndex;
  const safeSubIndex = Math.min(effectiveIndex, viewableFiles.length - 1);
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
                onClick={() => mode === 'browse' ? undefined : setSubIndex(i)}
              />
            ))}
          </div>
        </>
      )}

      {/* Caption panel (Instaloader .txt descriptions) */}
      <CaptionPanel caption={caption ?? ''} isLoading={captionLoading} />

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
