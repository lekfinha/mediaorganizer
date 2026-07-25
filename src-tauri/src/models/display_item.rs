use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub path: String,
    pub file_name: String,
    pub extension: String,
    pub suffix: String,
    pub size_bytes: u64,
    pub mime_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplayItem {
    pub id: String,
    pub base_name: String,
    pub files: Vec<FileEntry>,
    pub total_size_bytes: u64,
    pub is_heavy: bool,
    pub primary_index: usize,
    pub source_dir: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MediaType {
    Image,
    Video,
    Audio,
    Unknown,
}

impl DisplayItem {
    pub fn primary_file(&self) -> Option<&FileEntry> {
        self.files.get(self.primary_index)
    }

    pub fn media_type(&self) -> MediaType {
        if let Some(f) = self.primary_file() {
            if f.mime_type.starts_with("image/") { MediaType::Image }
            else if f.mime_type.starts_with("video/") { MediaType::Video }
            else if f.mime_type.starts_with("audio/") { MediaType::Audio }
            else { MediaType::Unknown }
        } else {
            MediaType::Unknown
        }
    }
}
