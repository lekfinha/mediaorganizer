import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { AppConfig, AppMode, GlobalSettings, Profile } from '../types';

const DEFAULT_CONFIG: AppConfig = {
  global_settings: {
    prefetch_buffer_size: 10,
    heavy_file_threshold_mb: 200,
    delete_fallback_chain: ['TrashCli', 'LocalTrashFolder', 'Rm'],
    on_name_collision: 'Prompt',
    default_sort_order: 'DateDesc',
  },
  profiles: {},
  directory_mappings: {},
};

interface ConfigState {
  config: AppConfig;
  configPath: string;
  isLoaded: boolean;

  loadConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
  updateSettings: (settings: Partial<GlobalSettings>) => void;
  addProfile: (key: string, profile: Profile) => void;
  removeProfile: (key: string) => void;
  getActiveShortcuts: (dirPath: string) => Record<string, string>;
  setDirectoryShortcut: (dirPath: string, key: string, dest: string) => void;
  removeDirectoryShortcut: (dirPath: string, key: string) => void;
  /** Persist the active mode for a directory */
  saveMode: (dirPath: string, mode: AppMode) => void;
  /** Retrieve the saved mode for a directory (undefined if never set) */
  getSavedMode: (dirPath: string) => AppMode | undefined;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: DEFAULT_CONFIG,
  configPath: '',
  isLoaded: false,

  loadConfig: async () => {
    try {
      const { appDataDir } = await import('@tauri-apps/api/path');
      const dir = await appDataDir();
      const configPath = `${dir}config.json`;
      const config = await invoke<AppConfig>('load_config', { configPath });
      set({ config, configPath, isLoaded: true });
    } catch (e) {
      console.error('Failed to load config:', e);
      set({ config: DEFAULT_CONFIG, isLoaded: true });
    }
  },

  saveConfig: async () => {
    const { config, configPath } = get();
    try {
      await invoke('save_config', { config, configPath });
    } catch (e) {
      console.error('Failed to save config:', e);
    }
  },

  updateSettings: (settings) => {
    set((state) => ({
      config: {
        ...state.config,
        global_settings: { ...state.config.global_settings, ...settings },
      },
    }));
    setTimeout(() => get().saveConfig(), 100);
  },

  addProfile: (key, profile) => {
    set((state) => ({
      config: {
        ...state.config,
        profiles: { ...state.config.profiles, [key]: profile },
      },
    }));
    get().saveConfig();
  },

  removeProfile: (key) => {
    set((state) => {
      const profiles = { ...state.config.profiles };
      delete profiles[key];
      return { config: { ...state.config, profiles } };
    });
    get().saveConfig();
  },

  getActiveShortcuts: (dirPath) => {
    const { config } = get();
    const mapping = config.directory_mappings[dirPath];
    if (!mapping) return {};
    const profile = config.profiles[mapping.active_profile];
    return {
      ...(profile?.shortcuts || {}),
      ...(mapping.custom_shortcuts || {}),
    };
  },

  setDirectoryShortcut: (dirPath, key, dest) => {
    set((state) => {
      const existing = state.config.directory_mappings[dirPath] ?? {
        active_profile: '',
        custom_shortcuts: {},
      };
      return {
        config: {
          ...state.config,
          directory_mappings: {
            ...state.config.directory_mappings,
            [dirPath]: {
              ...existing,
              custom_shortcuts: { ...existing.custom_shortcuts, [key]: dest },
            },
          },
        },
      };
    });
    setTimeout(() => get().saveConfig(), 100);
  },

  removeDirectoryShortcut: (dirPath, key) => {
    set((state) => {
      const existing = state.config.directory_mappings[dirPath];
      if (!existing) return state;
      const custom_shortcuts = { ...existing.custom_shortcuts };
      delete custom_shortcuts[key];
      return {
        config: {
          ...state.config,
          directory_mappings: {
            ...state.config.directory_mappings,
            [dirPath]: { ...existing, custom_shortcuts },
          },
        },
      };
    });
    setTimeout(() => get().saveConfig(), 100);
  },

  saveMode: (dirPath, mode) => {
    set((state) => {
      const existing = state.config.directory_mappings[dirPath] ?? {
        active_profile: '',
        custom_shortcuts: {},
      };
      return {
        config: {
          ...state.config,
          directory_mappings: {
            ...state.config.directory_mappings,
            [dirPath]: { ...existing, saved_mode: mode } as typeof existing & { saved_mode: AppMode },
          },
        },
      };
    });
    setTimeout(() => get().saveConfig(), 100);
  },

  getSavedMode: (dirPath) => {
    const mapping = get().config.directory_mappings[dirPath] as (typeof DEFAULT_CONFIG.directory_mappings[string] & { saved_mode?: AppMode }) | undefined;
    return mapping?.saved_mode;
  },
}));
