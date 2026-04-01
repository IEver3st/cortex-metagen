use std::collections::HashMap;
use std::env;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};
use tauri::Manager;

const MAX_SCAN_DEPTH: usize = 32;
const MAX_SCAN_FILES: usize = 20_000;
const MAX_SCAN_DURATION: Duration = Duration::from_secs(8);
const MAX_BUG_REPORT_LOG_CHARS: usize = 40_000;
const WORKSPACE_SWITCHER_FILENAME: &str = "workspace-switcher.json";

#[tauri::command]
fn read_meta_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_meta_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

fn workspace_switcher_state_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(WORKSPACE_SWITCHER_FILENAME))
}

#[tauri::command]
fn read_workspace_switcher_state(app: tauri::AppHandle) -> Result<String, String> {
    let path = workspace_switcher_state_path(&app)?;
    if !path.exists() {
        return Ok(String::new());
    }

    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_workspace_switcher_state(
    app: tauri::AppHandle,
    content: String,
) -> Result<(), String> {
    let path = workspace_switcher_state_path(&app)?;
    std::fs::write(path, content).map_err(|e| e.to_string())
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

#[derive(serde::Deserialize)]
struct UpdaterFeedPlatform {
    url: Option<String>,
}

#[derive(serde::Deserialize)]
struct UpdaterFeed {
    version: Option<String>,
    #[serde(rename = "pub_date")]
    pub_date: Option<String>,
    platforms: Option<HashMap<String, UpdaterFeedPlatform>>,
}

#[tauri::command]
async fn inspect_updater_release(endpoint: String) -> Result<serde_json::Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let client = reqwest::blocking::Client::builder()
            .user_agent(format!(
                "{}/{}",
                env!("CARGO_PKG_NAME"),
                env!("CARGO_PKG_VERSION")
            ))
            .build()
            .map_err(|e| format!("client build error: {e}"))?;

        let feed = client
            .get(&endpoint)
            .send()
            .and_then(|response| response.error_for_status())
            .map_err(|e| format!("fetch error: {e}"))?
            .json::<UpdaterFeed>()
            .map_err(|e| format!("parse error: {e}"))?;

        let version = feed
            .version
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty());
        let pub_date = feed
            .pub_date
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty());
        let url = feed.platforms.and_then(|platforms| {
            platforms.into_values().find_map(|platform| {
                platform
                    .url
                    .map(|value| value.trim().to_string())
                    .filter(|value| !value.is_empty())
            })
        });

        Ok(serde_json::json!({
            "version": version,
            "pubDate": pub_date,
            "url": url,
        }))
    })
    .await
    .map_err(|e| format!("join error: {e}"))?
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

/// Anonymous system information forwarded from the frontend.
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SystemInfo {
    gpu: Option<String>,
    cpu_cores: Option<u32>,
    ram_gb: Option<f64>,
    os: Option<String>,
}

fn format_system_info_section(info: &SystemInfo, platform_fallback: &str) -> String {
    let os = info.os.as_deref().unwrap_or(platform_fallback);
    let mut lines = vec![
        format!("- **OS:** {os}"),
    ];
    if let Some(gpu) = &info.gpu {
        lines.push(format!("- **GPU:** {gpu}"));
    }
    if let Some(cores) = info.cpu_cores {
        lines.push(format!("- **CPU:** {cores} logical cores"));
    }
    if let Some(ram) = info.ram_gb {
        lines.push(format!("- **RAM:** ~{ram} GB"));
    }
    format!("\n\n## System information\n{}", lines.join("\n"))
}

fn trim_to_last_chars(value: &str, max_chars: usize) -> (String, bool) {
    let char_count = value.chars().count();
    if char_count <= max_chars {
        return (value.to_string(), false);
    }

    let start = value
        .char_indices()
        .nth(char_count - max_chars)
        .map(|(idx, _)| idx)
        .unwrap_or(0);

    (value[start..].to_string(), true)
}

async fn post_github_issue(
    client: &reqwest::Client,
    config: &GitHubConfig,
    title: &str,
    body: &str,
    labels: &[&str],
) -> Result<(), String> {
    let url = format!(
        "https://api.github.com/repos/{}/{}/issues",
        config.owner, config.repo
    );

    let payload = serde_json::json!({
        "title": title,
        "body": body,
        "labels": labels,
    });

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", config.pat))
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

#[tauri::command]
async fn submit_bug_report(
    title: String,
    description: String,
    steps: String,
    logs: String,
    system_info: Option<SystemInfo>,
    state: tauri::State<'_, GitHubConfig>,
) -> Result<(), String> {
    let version = env!("CARGO_PKG_VERSION");
    let platform = std::env::consts::OS;
    let trimmed_logs = logs.trim();
    let logs_section = if trimmed_logs.is_empty() {
        String::new()
    } else {
        let (recent_logs, truncated) = trim_to_last_chars(trimmed_logs, MAX_BUG_REPORT_LOG_CHARS);
        let truncation_notice = if truncated {
            format!(
                "_Logs were truncated to the most recent {} characters._\n\n",
                MAX_BUG_REPORT_LOG_CHARS
            )
        } else {
            String::new()
        };

        format!(
            "\n\n## Attached logs\n{truncation_notice}```text\n{recent_logs}\n```"
        )
    };

    let sys_section = system_info
        .as_ref()
        .map(|s| format_system_info_section(s, platform))
        .unwrap_or_else(|| format!("\n\n## System information\n- **Platform:** {platform}"));

    let body = format!(
        "## Description\n{description}\n\n## Steps to reproduce\n{steps}{logs_section}{sys_section}\n\n---\n**App version:** {version}\n**Reported via:** in-app bug report"
    );

    let client = reqwest::Client::new();
    post_github_issue(&client, &state, &title, &body, &["bug", "user-report"]).await
}

#[tauri::command]
async fn submit_feature_request(
    title: String,
    problem: String,
    idea: String,
    system_info: Option<SystemInfo>,
    state: tauri::State<'_, GitHubConfig>,
) -> Result<(), String> {
    let version = env!("CARGO_PKG_VERSION");
    let platform = std::env::consts::OS;

    let sys_section = system_info
        .as_ref()
        .map(|s| format_system_info_section(s, platform))
        .unwrap_or_else(|| format!("\n\n## System information\n- **Platform:** {platform}"));

    let body = format!(
        "## Problem this solves\n{problem}\n\n## Proposed solution\n{idea}{sys_section}\n\n---\n**App version:** {version}\n**Reported via:** in-app feature request"
    );

    let client = reqwest::Client::new();
    post_github_issue(&client, &state, &title, &body, &["enhancement", "user-report"]).await
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
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(github_config)
        .invoke_handler(tauri::generate_handler![
            read_meta_file,
            write_meta_file,
            read_workspace_switcher_state,
            write_workspace_switcher_state,
            list_workspace_meta_files,
            write_zip_archive,
            inspect_updater_release,
            submit_bug_report,
            submit_feature_request
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
