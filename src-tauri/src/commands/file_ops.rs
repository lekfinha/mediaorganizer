use crate::models::config::{CollisionPolicy, DeleteMethod};
use crate::models::display_item::DisplayItem;
use crate::models::undo::UndoAction;
use crate::services::collision::{self, CollisionInfo, CollisionResolution};
use crate::services::trash;
use crate::AppState;
use serde::Deserialize;
#[allow(unused_imports)]
use serde::Serialize;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoveResult {
    pub success: bool,
    pub collision: Option<Vec<CollisionInfo>>,
    pub moved_paths: Vec<(String, String)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeleteResult {
    pub success: bool,
    pub method_used: DeleteMethod,
    pub trash_paths: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenameResult {
    pub success: bool,
    pub new_paths: Vec<String>,
}

#[tauri::command]
pub async fn move_item(
    item: DisplayItem,
    destination: String,
    collision_policy: CollisionPolicy,
    state: tauri::State<'_, AppState>,
) -> Result<MoveResult, String> {
    let collisions = collision::check_collisions(&item.files, &destination);
    
    if !collisions.is_empty() {
        match collision_policy {
            CollisionPolicy::Prompt => {
                return Ok(MoveResult {
                    success: false,
                    collision: Some(collisions),
                    moved_paths: Vec::new(),
                });
            }
            CollisionPolicy::Skip => {
                return Ok(MoveResult {
                    success: false,
                    collision: None,
                    moved_paths: Vec::new(),
                });
            }
            CollisionPolicy::AutoRename => {}
        }
    }

    let mut moved_paths = Vec::new();
    let mut original_paths = Vec::new();
    let mut destination_paths = Vec::new();

    let dest_path = Path::new(&destination);

    for f in &item.files {
        let mut final_name = f.file_name.clone();
        if !collisions.is_empty() {
            final_name = collision::generate_unique_name(&item.base_name, &f.extension, &destination);
        }

        let from = Path::new(&f.path);
        let to = dest_path.join(&final_name);

        if std::fs::rename(from, &to).is_err() {
            std::fs::copy(from, &to).map_err(|e| e.to_string())?;
            std::fs::remove_file(from).map_err(|e| e.to_string())?;
        }

        let to_str = to.to_string_lossy().to_string();
        moved_paths.push((f.path.clone(), to_str.clone()));
        original_paths.push(f.path.clone());
        destination_paths.push(to_str);
    }

    if let Ok(mut stack) = state.undo_stack.lock() {
        stack.push(UndoAction::Move {
            item_id: item.id,
            original_paths,
            destination_paths,
        });
    }

    Ok(MoveResult {
        success: true,
        collision: None,
        moved_paths,
    })
}

#[tauri::command]
pub async fn delete_item(
    item: DisplayItem,
    state: tauri::State<'_, AppState>,
) -> Result<DeleteResult, String> {
    let fallback_chain = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        config.global_settings.delete_fallback_chain.clone()
    };

    let original_paths: Vec<String> = item.files.iter().map(|f| f.path.clone()).collect();
    
    let (trash_paths, method_used) = trash::delete_files(
        &original_paths,
        &fallback_chain,
        &item.source_dir,
    )?;

    if let Ok(mut stack) = state.undo_stack.lock() {
        stack.push(UndoAction::Delete {
            item_id: item.id,
            original_paths,
            trash_paths: trash_paths.clone(),
            method_used: method_used.clone(),
        });
    }

    Ok(DeleteResult {
        success: true,
        method_used,
        trash_paths,
    })
}

#[tauri::command]
pub async fn rename_item(
    item: DisplayItem,
    new_base_name: String,
    state: tauri::State<'_, AppState>,
) -> Result<RenameResult, String> {
    let mut old_paths = Vec::new();
    let mut new_paths = Vec::new();
    
    for f in &item.files {
        let new_name = format!("{}{}.{}", new_base_name, f.suffix, f.extension);
        let from = Path::new(&f.path);
        let to = from.with_file_name(new_name);

        std::fs::rename(from, &to).map_err(|e| e.to_string())?;
        
        old_paths.push(f.path.clone());
        new_paths.push(to.to_string_lossy().to_string());
    }

    if let Ok(mut stack) = state.undo_stack.lock() {
        stack.push(UndoAction::Rename {
            item_id: item.id,
            old_paths,
            new_paths: new_paths.clone(),
        });
    }

    Ok(RenameResult {
        success: true,
        new_paths,
    })
}

#[tauri::command]
pub async fn resolve_collision(
    item: DisplayItem,
    destination: String,
    resolution: CollisionResolution,
    state: tauri::State<'_, AppState>,
) -> Result<MoveResult, String> {
    match resolution {
        CollisionResolution::Cancel => {
            Ok(MoveResult {
                success: false,
                collision: None,
                moved_paths: Vec::new(),
            })
        }
        CollisionResolution::AutoRename => {
            move_item(item, destination, CollisionPolicy::AutoRename, state).await
        }
        CollisionResolution::ManualRename { new_name } => {
            let mut moved_paths = Vec::new();
            let mut original_paths = Vec::new();
            let mut destination_paths = Vec::new();
            
            let dest_path = Path::new(&destination);

            for f in &item.files {
                let final_name = format!("{}{}.{}", new_name, f.suffix, f.extension);
                let from = Path::new(&f.path);
                let to = dest_path.join(&final_name);

                if std::fs::rename(from, &to).is_err() {
                    std::fs::copy(from, &to).map_err(|e| e.to_string())?;
                    std::fs::remove_file(from).map_err(|e| e.to_string())?;
                }

                let to_str = to.to_string_lossy().to_string();
                moved_paths.push((f.path.clone(), to_str.clone()));
                original_paths.push(f.path.clone());
                destination_paths.push(to_str);
            }

            if let Ok(mut stack) = state.undo_stack.lock() {
                stack.push(UndoAction::Move {
                    item_id: item.id,
                    original_paths,
                    destination_paths,
                });
            }

            Ok(MoveResult {
                success: true,
                collision: None,
                moved_paths,
            })
        }
    }
}
