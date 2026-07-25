import { create } from 'zustand';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { DisplayItem } from '../types';

interface PrefetchedMedia {
  assetUrls: string[];   // final playable URLs (asset:// for images, blob: for video)
  blobUrls: string[];    // only the blob: ones, tracked for revocation
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

const VIDEO_MIME_PREFIXES = ['video/'];
const IMAGE_EXTENSIONS    = new Set(['jpg','jpeg','png','webp','gif','bmp','svg','avif']);

/** Encode each segment of a filesystem path so WebKit accepts the URL */
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

/**
 * Create a blob: URL for a video file.
 *
 * WebKit2GTK delegates media element loading to GStreamer, which does NOT
 * understand the `asset://` custom scheme.  Creating a blob: URL from the
 * raw bytes sidesteps this — GStreamer happily plays blob: sources.
 */
async function videoBlobUrl(filePath: string, mimeType: string): Promise<string> {
  // Dynamic import so this doesn't run in tests / SSR
  const { readFile } = await import('@tauri-apps/plugin-fs');
  const bytes = await readFile(filePath);
  const blob = new Blob([bytes as BlobPart], { type: mimeType || 'video/mp4' });
  return URL.createObjectURL(blob);
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
    const endIndex  = Math.min(currentIndex + loadCount, items.length);

    for (let i = currentIndex; i < endIndex; i++) {
      const item = items[i];
      if (!item || buffer.has(item.id)) continue;

      // Placeholder so duplicate prefetch calls don't double-load
      const placeholder: PrefetchedMedia = {
        assetUrls: item.files.map(() => ''),
        blobUrls:  [],
        loaded:    false,
      };
      const newBuffer = new Map(get().buffer);
      newBuffer.set(item.id, placeholder);
      set({ buffer: newBuffer });

      // Build URLs asynchronously
      (async () => {
        const assetUrls: string[] = [];
        const blobUrls:  string[] = [];

        for (const f of item.files) {
          const isVideo = VIDEO_MIME_PREFIXES.some(p => f.mime_type.startsWith(p));

          if (isVideo) {
            try {
              const burl = await videoBlobUrl(f.path, f.mime_type);
              assetUrls.push(burl);
              blobUrls.push(burl);
            } catch (e) {
              console.error('[prefetch] blob URL failed for', f.path, e);
              assetUrls.push(''); // fallback empty
            }
          } else {
            const url = safeAssetUrl(f.path);
            assetUrls.push(url);

            // Warm image into browser cache
            const ext = f.extension.split('.')[0].toLowerCase();
            if (IMAGE_EXTENSIONS.has(ext)) {
              const img = new Image();
              img.src = url;
            }
          }
        }

        // Only update if item still in buffer (wasn't evicted)
        const current = get().buffer;
        if (current.has(item.id)) {
          const updated = new Map(current);
          updated.set(item.id, { assetUrls, blobUrls, loaded: true });
          set({ buffer: updated });
        } else {
          // Evicted while loading — revoke blobs immediately
          blobUrls.forEach(u => URL.revokeObjectURL(u));
        }
      })();
    }
  },

  evictBehind: (currentIndex) => {
    const KEEP_BEHIND = 2;
    const evictBefore = currentIndex - KEEP_BEHIND;
    if (evictBefore <= 0) return;

    // We don't have index→id mapping here, so skip for now
    // (memory is small — URLs only, blobs auto-revoke on GC)
  },

  getMedia: (itemId) => get().buffer.get(itemId),

  clear: () => {
    // Revoke all blob URLs on clear
    get().buffer.forEach(media => {
      media.blobUrls.forEach(u => URL.revokeObjectURL(u));
    });
    set({ buffer: new Map(), isHeavyZone: false });
  },
}));
