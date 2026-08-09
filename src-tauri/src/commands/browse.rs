use serde::{Deserialize, Serialize};
use std::fs;

/// A single subdirectory entry returned to the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubDir {
    pub name: String,
    pub path: String,
    /// True if this dir itself contains at least one subdirectory (allows
    /// the frontend to show/hide the expand toggle without a full listing).
    pub has_children: bool,
}

/// List the immediate (non-hidden) subdirectories of `path`, sorted
/// case-insensitively. Used by the Browse-mode directory tree panel.
#[tauri::command]
pub fn list_subdirs(path: String) -> Result<Vec<SubDir>, String> {
    let entries = fs::read_dir(&path)
        .map_err(|e| format!("Cannot read directory '{}': {}", path, e))?;

    let mut subdirs: Vec<SubDir> = entries
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_type()
                .map(|t| t.is_dir())
                .unwrap_or(false)
        })
        .map(|e| {
            let full_path = e.path().to_string_lossy().to_string();
            let name = e.file_name().to_string_lossy().to_string();
            // Peek one level to know if a ▶ toggle should be shown
            let has_children = fs::read_dir(&e.path())
                .map(|entries| {
                    entries
                        .filter_map(|e| e.ok())
                        .any(|e| {
                            let is_dir = e.file_type().map(|t| t.is_dir()).unwrap_or(false);
                            let is_hidden = e
                                .file_name()
                                .to_string_lossy()
                                .starts_with('.');
                            is_dir && !is_hidden
                        })
                })
                .unwrap_or(false);
            SubDir { name, path: full_path, has_children }
        })
        .filter(|s| !s.name.starts_with('.')) // skip hidden dirs (.git, etc.)
        .collect();

    subdirs.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(subdirs)
}
