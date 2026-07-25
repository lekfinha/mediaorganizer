use crate::models::config::SortOrder;
use crate::models::display_item::{DisplayItem, FileEntry};
use std::collections::HashMap;
use std::time::SystemTime;

/// Returns the "viewable" extension for grouping purposes.
/// Handles double extensions like `.json.xz` → treats whole file as non-media
/// by returning the full compound extension as the ext and stripping it from the stem.
///
/// For instaloader files like `2025-01-29_19-31-14_UTC.json.xz`:
///   stem   = "2025-01-29_19-31-14_UTC"
///   ext    = "json.xz"
///
/// For `2025-01-29_19-31-14_UTC.mp4`:
///   stem   = "2025-01-29_19-31-14_UTC"
///   ext    = "mp4"
fn split_name(file_name: &str) -> (String, String) {
    // Count dots (excluding leading dot for hidden files)
    let name = if file_name.starts_with('.') {
        &file_name[1..]
    } else {
        file_name
    };

    let parts: Vec<&str> = name.splitn(2, '.').collect();
    if parts.len() < 2 {
        // No extension at all
        return (file_name.to_string(), String::new());
    }

    let stem = parts[0].to_string();
    let rest = parts[1]; // everything after first dot, e.g. "json.xz" or "mp4"

    (stem, rest.to_string())
}

pub fn group_files_into_display_items(
    dir_path: &str,
    heavy_threshold_mb: u64,
    sort_order: &SortOrder,
) -> Result<(Vec<DisplayItem>, Vec<DisplayItem>), String> {
    let mut groups: HashMap<String, Vec<FileEntry>> = HashMap::new();
    let entries = std::fs::read_dir(dir_path).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let path = entry.path();
        if path.is_dir() { continue; }

        let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
        if file_name.starts_with('.') { continue; }

        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        let size_bytes = metadata.len();

        // Use our custom split to correctly handle double extensions
        let (stem, full_extension) = split_name(&file_name);
        let mime_type = mime_guess::from_path(&path).first_or_octet_stream().to_string();

        // For instaloader: stem is already the base_name (e.g. "2025-01-29_19-31-14_UTC")
        // No numeric suffix stripping needed for this format.
        // But we still support the pattern for other use cases (e.g. "post_1.jpg" → base "post").
        let (base_name, suffix) = {
            let re = regex::Regex::new(r"^(.*?)(?:_(\d+))?$").unwrap();
            let captures = re.captures(&stem).unwrap();
            let base = captures.get(1).map_or(stem.clone(), |m| m.as_str().to_string());
            let suf = captures.get(2).map_or(String::new(), |m| format!("_{}", m.as_str()));
            (base, suf)
        };

        let file_entry = FileEntry {
            path: path.to_string_lossy().to_string(),
            file_name,
            extension: full_extension,
            suffix,
            size_bytes,
            mime_type,
        };

        groups.entry(base_name).or_insert_with(Vec::new).push(file_entry);
    }

    let mut all_items = Vec::new();
    let threshold_bytes = heavy_threshold_mb * 1024 * 1024;

    for (base_name, mut files) in groups {
        files.sort_by(|a, b| a.file_name.cmp(&b.file_name));

        let total_size_bytes: u64 = files.iter().map(|f| f.size_bytes).sum();
        let is_heavy = total_size_bytes > threshold_bytes;

        // primary_index: prefer image first, then video, then first viewable file
        let mut primary_index = 0;
        let mut found = false;
        for (i, f) in files.iter().enumerate() {
            if f.mime_type.starts_with("image/") {
                primary_index = i;
                found = true;
                break;
            } else if f.mime_type.starts_with("video/") && !found {
                primary_index = i;
                found = true;
            }
        }
        let _ = found;

        let item = DisplayItem {
            id: uuid::Uuid::new_v4().to_string(),
            base_name,
            files,
            total_size_bytes,
            is_heavy,
            primary_index,
            source_dir: dir_path.to_string(),
        };
        all_items.push(item);
    }

    match sort_order {
        SortOrder::DateDesc => {
            all_items.sort_by(|a, b| {
                let ta = std::fs::metadata(&a.files[0].path).and_then(|m| m.modified()).unwrap_or(SystemTime::UNIX_EPOCH);
                let tb = std::fs::metadata(&b.files[0].path).and_then(|m| m.modified()).unwrap_or(SystemTime::UNIX_EPOCH);
                tb.cmp(&ta)
            });
        }
        SortOrder::DateAsc => {
            all_items.sort_by(|a, b| {
                let ta = std::fs::metadata(&a.files[0].path).and_then(|m| m.modified()).unwrap_or(SystemTime::UNIX_EPOCH);
                let tb = std::fs::metadata(&b.files[0].path).and_then(|m| m.modified()).unwrap_or(SystemTime::UNIX_EPOCH);
                ta.cmp(&tb)
            });
        }
        SortOrder::NameAsc => {
            all_items.sort_by(|a, b| a.base_name.cmp(&b.base_name));
        }
        SortOrder::NameDesc => {
            all_items.sort_by(|a, b| b.base_name.cmp(&a.base_name));
        }
        SortOrder::SizeDesc => {
            all_items.sort_by(|a, b| b.total_size_bytes.cmp(&a.total_size_bytes));
        }
        SortOrder::SizeAsc => {
            all_items.sort_by(|a, b| a.total_size_bytes.cmp(&b.total_size_bytes));
        }
    }

    let mut normal_items = Vec::new();
    let mut heavy_items = Vec::new();

    for item in all_items {
        if item.is_heavy { heavy_items.push(item); }
        else { normal_items.push(item); }
    }

    Ok((normal_items, heavy_items))
}
