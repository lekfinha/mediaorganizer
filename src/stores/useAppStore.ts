import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type {
  DisplayItem, AppMode, ScanResult, MoveResult,
  DeleteResult, RenameResult, CollisionInfo, CollisionResolution,
} from '../types';
import { usePrefetchStore } from './usePrefetchStore';
import { useConfigStore } from './useConfigStore';

interface AppState {
  // Queue
  items: DisplayItem[];
  currentIndex: number;
  /** Fixed at scan time — never decreases as items are processed */
  totalCount: number;
  /** How many items have been actioned (moved/deleted) — used for progress */
  processedCount: number;
  mode: AppMode;
  currentDir: string;

  // UI State
  isCollisionOverlayOpen: boolean;
  pendingCollision: CollisionInfo[] | null;
  pendingMoveDestination: string | null;
  isSettingsOpen: boolean;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;

  // Actions
  scanDirectory: (path: string) => Promise<void>;
  advance: () => void;
  goBack: () => void;
  deleteCurrentItem: () => Promise<void>;
  moveCurrentItem: (destination: string) => Promise<void>;
  resolveCollision: (resolution: CollisionResolution) => Promise<void>;
  renameCurrentItem: (newName: string) => Promise<void>;
  undo: () => Promise<void>;
  setMode: (mode: AppMode) => void;
  toggleSettings: () => void;
  dismissError: () => void;
  getCurrentItem: () => DisplayItem | null;
}

export const useAppStore = create<AppState>((set, get) => ({
  items: [],
  currentIndex: 0,
  totalCount: 0,
  processedCount: 0,
  mode: 'binary',
  currentDir: '',

  isCollisionOverlayOpen: false,
  pendingCollision: null,
  pendingMoveDestination: null,
  isSettingsOpen: false,
  isLoading: false,
  loadingMessage: '',
  error: null,

  scanDirectory: async (path) => {
    set({ isLoading: true, loadingMessage: 'Escaneando directorio…', error: null });
    try {
      const configStore = useConfigStore.getState();
      const settings = configStore.config.global_settings;

      // Restore saved mode for this directory
      const savedMode = configStore.getSavedMode(path);

      set({ loadingMessage: 'Agrupando archivos…' });
      const result = await invoke<ScanResult>('scan_directory', { path, settings });
      const allItems = [...result.items, ...result.heavy_items];

      set({
        items: allItems,
        currentIndex: 0,
        totalCount: result.total_count,   // fixed at scan time
        processedCount: 0,
        currentDir: path,
        isLoading: false,
        loadingMessage: '',
        // Restore mode if saved, otherwise keep current
        mode: savedMode ?? get().mode,
      });

      // Start prefetching
      usePrefetchStore.getState().clear();
      usePrefetchStore.getState().prefetchAhead(0, allItems);
    } catch (e) {
      set({ isLoading: false, loadingMessage: '', error: String(e) });
    }
  },

  advance: () => {
    const { currentIndex, items } = get();
    if (currentIndex < items.length - 1) {
      const newIndex = currentIndex + 1;
      set({ currentIndex: newIndex });
      usePrefetchStore.getState().prefetchAhead(newIndex, items);
      usePrefetchStore.getState().evictBehind(newIndex);
    }
  },

  goBack: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1 });
    }
  },

  deleteCurrentItem: async () => {
    const item = get().getCurrentItem();
    if (!item) return;

    try {
      await invoke<DeleteResult>('delete_item', { item });
      set((state) => {
        const newItems = state.items.filter((_, i) => i !== state.currentIndex);
        const newIndex = Math.min(state.currentIndex, newItems.length - 1);
        return {
          items: newItems,
          currentIndex: Math.max(0, newIndex),
          // totalCount stays fixed; processedCount increments
          processedCount: state.processedCount + 1,
        };
      });
      const { currentIndex, items } = get();
      usePrefetchStore.getState().prefetchAhead(currentIndex, items);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  moveCurrentItem: async (destination) => {
    const item = get().getCurrentItem();
    if (!item) return;

    const { config } = useConfigStore.getState();
    const collisionPolicy = config.global_settings.on_name_collision;

    try {
      const destPath = destination.startsWith('/')
        ? destination
        : `${item.source_dir}/${destination}`;

      const result = await invoke<MoveResult>('move_item', {
        item,
        destination: destPath,
        collisionPolicy,
      });

      if (!result.success && result.collision) {
        set({
          isCollisionOverlayOpen: true,
          pendingCollision: result.collision,
          pendingMoveDestination: destPath,
        });
        return;
      }

      if (result.success) {
        set((state) => {
          const newItems = state.items.filter((_, i) => i !== state.currentIndex);
          const newIndex = Math.min(state.currentIndex, newItems.length - 1);
          return {
            items: newItems,
            currentIndex: Math.max(0, newIndex),
            processedCount: state.processedCount + 1,
          };
        });
        const { currentIndex, items } = get();
        usePrefetchStore.getState().prefetchAhead(currentIndex, items);
      }
    } catch (e) {
      set({ error: String(e) });
    }
  },

  resolveCollision: async (resolution) => {
    const item = get().getCurrentItem();
    const { pendingMoveDestination } = get();
    if (!item || !pendingMoveDestination) return;

    set({ isCollisionOverlayOpen: false, pendingCollision: null });
    if (resolution.type === 'Cancel') return;

    try {
      const result = await invoke<MoveResult>('resolve_collision', {
        item,
        destination: pendingMoveDestination,
        resolution,
      });

      if (result.success) {
        set((state) => {
          const newItems = state.items.filter((_, i) => i !== state.currentIndex);
          const newIndex = Math.min(state.currentIndex, newItems.length - 1);
          return {
            items: newItems,
            currentIndex: Math.max(0, newIndex),
            processedCount: state.processedCount + 1,
            pendingMoveDestination: null,
          };
        });
      }
    } catch (e) {
      set({ error: String(e) });
    }
  },

  renameCurrentItem: async (newName) => {
    const item = get().getCurrentItem();
    if (!item) return;

    try {
      const result = await invoke<RenameResult>('rename_item', {
        item,
        newBaseName: newName,
      });

      if (result.success) {
        set((state) => {
          const newItems = [...state.items];
          const currentItem = { ...newItems[state.currentIndex] };
          currentItem.base_name = newName;
          currentItem.files = currentItem.files.map((f, i) => ({
            ...f,
            path: result.new_paths[i] || f.path,
            file_name: result.new_paths[i]?.split('/').pop() || f.file_name,
          }));
          newItems[state.currentIndex] = currentItem;
          return { items: newItems };
        });
      }
    } catch (e) {
      set({ error: String(e) });
    }
  },

  undo: async () => {
    try {
      await invoke<string>('undo_last_action');
      const { currentDir } = get();
      if (currentDir) {
        await get().scanDirectory(currentDir);
      }
    } catch (e) {
      set({ error: String(e) });
    }
  },

  setMode: (mode) => {
    set({ mode });
    // Persist mode for current directory
    const { currentDir } = get();
    if (currentDir) {
      useConfigStore.getState().saveMode(currentDir, mode);
    }
  },

  toggleSettings: () => set((s) => ({ isSettingsOpen: !s.isSettingsOpen })),
  dismissError: () => set({ error: null }),

  getCurrentItem: () => {
    const { items, currentIndex } = get();
    return items[currentIndex] || null;
  },
}));
