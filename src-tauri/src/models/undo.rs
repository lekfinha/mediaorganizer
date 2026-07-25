use serde::{Deserialize, Serialize};
use super::config::DeleteMethod;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UndoAction {
    Move {
        item_id: String,
        original_paths: Vec<String>,
        destination_paths: Vec<String>,
    },
    Delete {
        item_id: String,
        original_paths: Vec<String>,
        trash_paths: Vec<String>,
        method_used: DeleteMethod,
    },
    Rename {
        item_id: String,
        old_paths: Vec<String>,
        new_paths: Vec<String>,
    },
}
