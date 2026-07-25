use crate::AppState;
use crate::models::undo::UndoAction;
use crate::models::config::DeleteMethod;

#[tauri::command]
pub async fn undo_last_action(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let mut stack = state.undo_stack.lock().map_err(|e| e.to_string())?;
    let action = stack.pop().ok_or("Nothing to undo")?;
    match action {
        UndoAction::Move { original_paths, destination_paths, .. } => {
            for (dest, orig) in destination_paths.iter().zip(original_paths.iter()) {
                std::fs::rename(dest, orig).map_err(|e| e.to_string())?;
            }
            Ok("Move undone".to_string())
        }
        UndoAction::Delete { original_paths, trash_paths, method_used, .. } => {
            match method_used {
                DeleteMethod::Rm => Err("Cannot undo permanent deletion".to_string()),
                _ => {
                    for (trash, orig) in trash_paths.iter().zip(original_paths.iter()) {
                        std::fs::rename(trash, orig).map_err(|e| e.to_string())?;
                    }
                    Ok("Delete undone".to_string())
                }
            }
        }
        UndoAction::Rename { old_paths, new_paths, .. } => {
            for (new, old) in new_paths.iter().zip(old_paths.iter()) {
                std::fs::rename(new, old).map_err(|e| e.to_string())?;
            }
            Ok("Rename undone".to_string())
        }
    }
}
