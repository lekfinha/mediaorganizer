use crate::models::config::DeleteMethod;
use std::path::Path;

pub fn delete_files(
    paths: &[String],
    fallback_chain: &[DeleteMethod],
    source_dir: &str,
) -> Result<(Vec<String>, DeleteMethod), String> {
    for method in fallback_chain {
        match method {
            DeleteMethod::TrashCli => {
                let mut success = true;
                for p in paths {
                    if trash::delete(p).is_err() {
                        success = false;
                        break;
                    }
                }
                if success {
                    return Ok((paths.to_vec(), DeleteMethod::TrashCli));
                }
            }
            DeleteMethod::LocalTrashFolder => {
                let trash_dir = Path::new(source_dir).join("_trash");
                if !trash_dir.exists() {
                    if std::fs::create_dir_all(&trash_dir).is_err() { continue; }
                }

                let mut trash_paths = Vec::new();
                let mut success = true;

                for p in paths {
                    let path = Path::new(p);
                    if let Some(file_name) = path.file_name() {
                        let dest = trash_dir.join(file_name);
                        if std::fs::rename(path, &dest).is_ok() {
                            trash_paths.push(dest.to_string_lossy().to_string());
                        } else {
                            success = false;
                            break;
                        }
                    }
                }
                
                if success { return Ok((trash_paths, DeleteMethod::LocalTrashFolder)); }
            }
            DeleteMethod::Rm => {
                let mut success = true;
                for p in paths {
                    if std::fs::remove_file(p).is_err() {
                        success = false;
                        break;
                    }
                }
                if success { return Ok((Vec::new(), DeleteMethod::Rm)); }
            }
        }
    }
    Err("All delete methods failed".to_string())
}
