pub mod commands;
pub mod models;
pub mod services;

use models::config::AppConfig;
use models::undo::UndoAction;
use std::sync::Mutex;

pub struct AppState {
    pub undo_stack: Mutex<Vec<UndoAction>>,
    pub config: Mutex<AppConfig>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState {
            undo_stack: Mutex::new(Vec::new()),
            config: Mutex::new(AppConfig::default()),
        })
        .invoke_handler(tauri::generate_handler![
            commands::scan::scan_directory,
            commands::file_ops::move_item,
            commands::file_ops::delete_item,
            commands::file_ops::rename_item,
            commands::file_ops::resolve_collision,
            commands::undo::undo_last_action,
            commands::prefetch::get_prefetch_info,
            commands::config::load_config,
            commands::config::save_config,
            commands::caption::read_caption,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
