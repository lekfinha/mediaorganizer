import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { DisplayItem } from '../types';

interface UseCaptionResult {
  caption: string | null;
  isLoading: boolean;
}

/**
 * Reads the .txt caption file for an Instaloader-style item.
 * Instaloader stores captions as <base_name>.txt next to the media files.
 *
 * We derive base_path from the path of the first file in the group by
 * stripping its extension, then pass it to the Rust `read_caption` command.
 */
export function useCaption(item: DisplayItem | null): UseCaptionResult {
  const [caption, setCaption] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!item) {
      setCaption(null);
      return;
    }

    // Check if this item has a .txt file associated
    const hasTxt = item.files.some(f => f.extension.toLowerCase() === 'txt');
    if (!hasTxt) {
      setCaption(null);
      return;
    }

    // Derive base_path from the path of the first file (strip extension)
    const firstFile = item.files[0];
    if (!firstFile) {
      setCaption(null);
      return;
    }

    // Remove the last extension: "/path/to/2025-01-29_UTC.jpg" → "/path/to/2025-01-29_UTC"
    const dotIdx = firstFile.path.lastIndexOf('.');
    if (dotIdx < 0) {
      setCaption(null);
      return;
    }
    const basePath = firstFile.path.slice(0, dotIdx);

    let cancelled = false;
    setIsLoading(true);
    setCaption(null);

    invoke<string>('read_caption', { itemBasePath: basePath })
      .then(text => {
        if (!cancelled) setCaption(text || null);
      })
      .catch(() => {
        if (!cancelled) setCaption(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [item?.id]);

  return { caption, isLoading };
}
