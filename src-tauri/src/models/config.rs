use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub global_settings: GlobalSettings,
    pub profiles: HashMap<String, Profile>,
    pub directory_mappings: HashMap<String, DirectoryMapping>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalSettings {
    pub prefetch_buffer_size: usize,
    pub heavy_file_threshold_mb: u64,
    pub delete_fallback_chain: Vec<DeleteMethod>,
    pub on_name_collision: CollisionPolicy,
    pub default_sort_order: SortOrder,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DeleteMethod {
    TrashCli,
    LocalTrashFolder,
    Rm,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum CollisionPolicy {
    Prompt,
    AutoRename,
    Skip,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SortOrder {
    DateDesc,
    DateAsc,
    NameAsc,
    NameDesc,
    SizeDesc,
    SizeAsc,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub name: String,
    pub shortcuts: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryMapping {
    pub active_profile: String,
    pub custom_shortcuts: HashMap<String, String>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            global_settings: GlobalSettings {
                prefetch_buffer_size: 10,
                heavy_file_threshold_mb: 200,
                delete_fallback_chain: vec![
                    DeleteMethod::TrashCli,
                    DeleteMethod::LocalTrashFolder,
                    DeleteMethod::Rm,
                ],
                on_name_collision: CollisionPolicy::Prompt,
                default_sort_order: SortOrder::DateDesc,
            },
            profiles: HashMap::new(),
            directory_mappings: HashMap::new(),
        }
    }
}
