use std::path::Path;

#[tauri::command]
fn read_meta_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_meta_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

fn collect_meta_files(dir: &Path, out: &mut Vec<String>) -> Result<(), String> {
    let entries = std::fs::read_dir(dir).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_dir() {
            collect_meta_files(&path, out)?;
            continue;
        }

        if path.is_file() {
            if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                let ext = ext.to_ascii_lowercase();
                if ext == "meta" || ext == "xml" {
                    out.push(path.to_string_lossy().to_string());
                }
            }
        }
    }

    Ok(())
}

#[tauri::command]
fn list_workspace_meta_files(path: String) -> Result<Vec<String>, String> {
    let root = Path::new(&path);
    if !root.exists() {
        return Err("Workspace path does not exist".into());
    }
    if !root.is_dir() {
        return Err("Workspace path is not a directory".into());
    }

    let mut files = Vec::new();
    collect_meta_files(root, &mut files)?;
    files.sort();
    Ok(files)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            read_meta_file,
            write_meta_file,
            list_workspace_meta_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
