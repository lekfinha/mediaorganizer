use std::fs;
use tauri::command;

/// Reads the `.txt` caption file associated with an Instaloader item.
///
/// Instaloader saves descriptions as `<basename>.txt` next to the media file.
/// We receive the path of any file in the group and derive the txt path by
/// replacing the extension with `.txt`.
#[command]
pub fn read_caption(item_base_path: String) -> Result<String, String> {
    // item_base_path is the directory + base name WITHOUT extension,
    // e.g. "/home/user/saved/2025-01-29_19-31-14_UTC"
    let txt_path = format!("{}.txt", item_base_path);
    match fs::read_to_string(&txt_path) {
        Ok(content) => Ok(content.trim().to_string()),
        Err(e) => Err(format!("No se pudo leer el caption: {}", e)),
    }
}
