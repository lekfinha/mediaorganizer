use crate::models::config::GlobalSettings;
use crate::models::display_item::DisplayItem;
use crate::services::grouper;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub items: Vec<DisplayItem>,
    pub heavy_items: Vec<DisplayItem>,
    pub total_count: usize,
}

#[tauri::command]
pub async fn scan_directory(path: String, settings: GlobalSettings) -> Result<ScanResult, String> {
    let (items, heavy_items) = grouper::group_files_into_display_items(
        &path,
        settings.heavy_file_threshold_mb,
        &settings.default_sort_order,
    )?;
    let total_count = items.len() + heavy_items.len();
    Ok(ScanResult { items, heavy_items, total_count })
}
