use crate::models::config::AppConfig;
use std::path::Path;

#[tauri::command]
pub async fn load_config(config_path: String) -> Result<AppConfig, String> {
    let path = Path::new(&config_path);
    if path.exists() {
        let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())
    } else {
        Ok(AppConfig::default())
    }
}

#[tauri::command]
pub async fn save_config(config: AppConfig, config_path: String) -> Result<(), String> {
    let path = Path::new(&config_path);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let content = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    std::fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}
