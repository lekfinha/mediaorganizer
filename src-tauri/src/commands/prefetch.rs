use serde::{Deserialize, Serialize};
use crate::models::display_item::{DisplayItem, MediaType};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrefetchInfo {
    pub item_id: String,
    pub asset_urls: Vec<String>,
    pub media_type: MediaType,
    pub total_size_bytes: u64,
}

#[tauri::command]
pub async fn get_prefetch_info(items: Vec<DisplayItem>) -> Result<Vec<PrefetchInfo>, String> {
    Ok(items.iter().map(|item| PrefetchInfo {
        item_id: item.id.clone(),
        asset_urls: item.files.iter().map(|f| f.path.clone()).collect(),
        media_type: item.media_type(),
        total_size_bytes: item.total_size_bytes,
    }).collect())
}
