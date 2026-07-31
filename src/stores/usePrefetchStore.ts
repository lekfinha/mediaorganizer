import { create } from 'zustand';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { DisplayItem } from '../types';

interface PrefetchedMedia {
  /**
   * Final URLs for each file in the item.
   * - Images/other: `asset://localhost/...` (served by Tauri asset protocol)
   * - Videos: raw file path (`/home/...`)  — VideoPlayer creates the Blob URL
   *   lazily and only for the one video currently on screen, avoiding OOM.
   */
  assetUrls: string[];
  loaded: boolean;
}

interface PrefetchState {
  buffer: Map<string, PrefetchedMedia>;
  bufferSize: number;
  isHeavyZone: boolean;

  setBufferSize: (size: number) => void;
  prefetchAhead: (currentIndex: number, items: DisplayItem[]) => void;
  evictBehind: (currentIndex: number) => void;
  getMedia: (itemId: string) => PrefetchedMedia | undefined;
  clear: () => void;
}

const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'avif',
]);

/** Encode each segment of a filesystem path so WebKit accepts the URL. */
function safeAssetUrl(filePath: string): string {
  const raw = convertFileSrc(filePath);
  try {
    const url = new URL(raw);
    const encoded = url.pathname
      .split('/')
      .map(seg => encodeURIComponent(decodeURIComponent(seg)))
      .join('/');
    return `${url.protocol}//${url.host}${encoded}`;
  } catch {
    return raw;
  }
}

export const usePrefetchStore = create<PrefetchState>((set, get) => ({
  buffer: new Map(),
  bufferSize: 10,
  isHeavyZone: false,

  setBufferSize: (size) => set({ bufferSize: size }),

  prefetchAhead: (currentIndex, items) => {
    const { bufferSize, buffer } = get();

    const remainingItems = items.slice(currentIndex);
    const allHeavy = remainingItems.every(item => item.is_heavy);
    set({ isHeavyZone: allHeavy });

    const loadCount = allHeavy ? 1 : bufferSize;
    const endIndex = Math.min(currentIndex + loadCount, items.length);

    for (let i = currentIndex; i < endIndex; i++) {
      const item = items[i];
      if (!item || buffer.has(item.id)) continue;

      // Build URL list synchronously — no async readFile for videos.
      // Videos get their raw file path so VideoPlayer can create a Blob
      // on demand for the single video being watched.
      const assetUrls = item.files.map(f => {
        const isVideo = f.mime_type.startsWith('video/');
        if (isVideo) {
          // Return the raw file path — VideoPlayer handles blob creation.
          return f.path;
        }

        const url = safeAssetUrl(f.path);

        // Warm images into the browser cache.
        const ext = f.extension.toLowerCase();
        if (IMAGE_EXTENSIONS.has(ext)) {
          const img = new Image();
          img.src = url;
        }

        return url;
      });

      const newBuffer = new Map(get().buffer);
      newBuffer.set(item.id, { assetUrls, loaded: true });
      set({ buffer: newBuffer });
    }
  },

  evictBehind: (_currentIndex) => {
    // No blob URLs to revoke any more — nothing to do here.
  },

  getMedia: (itemId) => get().buffer.get(itemId),

  clear: () => {
    // No blob URLs to revoke — just clear the map.
    set({ buffer: new Map(), isHeavyZone: false });
  },
}));
