use crate::models::display_item::FileEntry;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollisionInfo {
    pub source_file: String,
    pub existing_file: String,
    pub source_size: u64,
    pub existing_size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CollisionResolution {
    AutoRename,
    ManualRename { new_name: String },
    Cancel,
}

pub fn check_collisions(files: &[FileEntry], dest_dir: &str) -> Vec<CollisionInfo> {
    let mut collisions = Vec::new();
    let dest_path = Path::new(dest_dir);

    for f in files {
        let potential_dest = dest_path.join(&f.file_name);
        if potential_dest.exists() {
            let existing_size = std::fs::metadata(&potential_dest).map(|m| m.len()).unwrap_or(0);
            collisions.push(CollisionInfo {
                source_file: f.path.clone(),
                existing_file: potential_dest.to_string_lossy().to_string(),
                source_size: f.size_bytes,
                existing_size,
            });
        }
    }
    
    collisions
}

pub fn generate_unique_name(base: &str, ext: &str, dest_dir: &str) -> String {
    let dest_path = Path::new(dest_dir);
    let mut i = 1;
    loop {
        let new_name = format!("{}_{}.{}", base, i, ext);
        if !dest_path.join(&new_name).exists() {
            return new_name;
        }
        i += 1;
    }
}
