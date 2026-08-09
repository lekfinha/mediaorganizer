// === File Entry ===
export interface FileEntry {
  path: string;
  file_name: string;
  extension: string;
  suffix: string;
  size_bytes: number;
  mime_type: string;
}

// === Display Item ===
export interface DisplayItem {
  id: string;
  base_name: string;
  files: FileEntry[];
  total_size_bytes: number;
  is_heavy: boolean;
  primary_index: number;
  source_dir: string;
}

// === Media Type ===
export type MediaType = 'Image' | 'Video' | 'Audio' | 'Unknown';

// === Config ===
export type DeleteMethod = 'TrashCli' | 'LocalTrashFolder' | 'Rm';
export type CollisionPolicy = 'Prompt' | 'AutoRename' | 'Skip';
export type SortOrder = 'DateDesc' | 'DateAsc' | 'NameAsc' | 'NameDesc' | 'SizeDesc' | 'SizeAsc';

export interface GlobalSettings {
  prefetch_buffer_size: number;
  heavy_file_threshold_mb: number;
  delete_fallback_chain: DeleteMethod[];
  on_name_collision: CollisionPolicy;
  default_sort_order: SortOrder;
}

export interface Profile {
  name: string;
  shortcuts: Record<string, string>;
}

export interface DirectoryMapping {
  active_profile: string;
  custom_shortcuts: Record<string, string>;
}

export interface AppConfig {
  global_settings: GlobalSettings;
  profiles: Record<string, Profile>;
  directory_mappings: Record<string, DirectoryMapping>;
}

// === Operation Results ===
export interface ScanResult {
  items: DisplayItem[];
  heavy_items: DisplayItem[];
  total_count: number;
}

export interface CollisionInfo {
  source_file: string;
  existing_file: string;
  source_size: number;
  existing_size: number;
}

export type CollisionResolution =
  | { type: 'AutoRename' }
  | { type: 'ManualRename'; new_name: string }
  | { type: 'Cancel' };

export interface MoveResult {
  success: boolean;
  collision: CollisionInfo[] | null;
  moved_paths: [string, string][];
}

export interface DeleteResult {
  success: boolean;
  method_used: DeleteMethod;
  trash_paths: string[];
}

export interface RenameResult {
  success: boolean;
  new_paths: string[];
}

export interface PrefetchInfo {
  item_id: string;
  asset_urls: string[];
  media_type: MediaType;
  total_size_bytes: number;
}

export type AppMode = 'binary' | 'classify' | 'browse';
