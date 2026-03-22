use std::env;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

const MAX_SCAN_DEPTH: usize = 32;
const MAX_SCAN_FILES: usize = 20_000;
const MAX_SCAN_DURATION: Duration = Duration::from_secs(8);

#[tauri::command]
fn read_meta_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_meta_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

#[derive(serde::Deserialize)]
pub struct ArchiveEntry {
    pub filename: String,
    pub content: String,
}

#[tauri::command]
fn write_zip_archive(path: String, entries: Vec<ArchiveEntry>) -> Result<(), String> {
    let dest_path = Path::new(&path);
    if let Some(parent) = dest_path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }

    let file = std::fs::File::create(dest_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o644);

    for entry in entries {
        zip.start_file(&entry.filename, options)
            .map_err(|e| e.to_string())?;
        zip.write_all(entry.content.as_bytes())
            .map_err(|e| e.to_string())?;
    }

    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

fn is_supported_meta_file(path: &Path) -> bool {
    let ext = path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or_default();
    let lowered = ext.to_ascii_lowercase();
    lowered == "meta" || lowered == "xml"
}

fn normalize_relative_path(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

fn collect_meta_files(root: &Path, out: &mut Vec<String>) -> Result<(), String> {
    let start = Instant::now();
    let mut stack: Vec<(PathBuf, usize)> = vec![(root.to_path_buf(), 0)];

    while let Some((dir, depth)) = stack.pop() {
        if start.elapsed() > MAX_SCAN_DURATION {
            return Err(
                "Workspace scan timed out. Narrow the folder scope and try again.".to_string(),
            );
        }

        if depth > MAX_SCAN_DEPTH {
            continue;
        }

        let entries = std::fs::read_dir(&dir).map_err(|e| e.to_string())?;
        for entry_result in entries {
            if out.len() >= MAX_SCAN_FILES {
                return Err(
                    "Workspace scan hit the file limit. Narrow the folder scope and try again."
                        .to_string(),
                );
            }

            let entry = entry_result.map_err(|e| e.to_string())?;
            let path = entry.path();
            let metadata = std::fs::symlink_metadata(&path).map_err(|e| e.to_string())?;

            if metadata.file_type().is_symlink() {
                continue;
            }

            if metadata.is_dir() {
                if depth < MAX_SCAN_DEPTH {
                    stack.push((path, depth + 1));
                }
                continue;
            }

            if !metadata.is_file() || !is_supported_meta_file(&path) {
                continue;
            }

            let relative = path.strip_prefix(root).unwrap_or(&path);
            out.push(normalize_relative_path(relative));
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

// ---------------------------------------------------------------------------
// GitHub bug-report integration
// ---------------------------------------------------------------------------

#[derive(Clone)]
struct GitHubConfig {
    pat: String,
    owner: String,
    repo: String,
}

#[tauri::command]
async fn submit_bug_report(
    title: String,
    description: String,
    steps: String,
    state: tauri::State<'_, GitHubConfig>,
) -> Result<(), String> {
    let version = env!("CARGO_PKG_VERSION");
    let os = std::env::consts::OS;

    let body = format!(
        "## Description\n{description}\n\n## Steps to reproduce\n{steps}\n\n---\n**App version:** {version}\n**Platform:** {os}\n**Reported via:** in-app bug report"
    );

    let payload = serde_json::json!({
        "title": title,
        "body": body,
        "labels": ["bug", "user-report"]
    });

    let client = reqwest::Client::new();
    let url = format!(
        "https://api.github.com/repos/{}/{}/issues",
        state.owner, state.repo
    );

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", state.pat))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .header("User-Agent", "cortex-metagen")
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {text}"));
    }

    Ok(())
}

// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = dotenv::dotenv();

    let github_config = GitHubConfig {
        pat: env::var("GITHUB_PAT").unwrap_or_default(),
        owner: env::var("GITHUB_REPO_OWNER").unwrap_or_else(|_| "iever3st".to_string()),
        repo: env::var("GITHUB_REPO_NAME").unwrap_or_else(|_| "cortex-metagen".to_string()),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(github_config)
        .invoke_handler(tauri::generate_handler![
            read_meta_file,
            write_meta_file,
            list_workspace_meta_files,
            write_zip_archive,
            submit_bug_report
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
