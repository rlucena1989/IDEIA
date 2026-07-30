use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{command, State};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IdeServerState {
    pub running: bool,
    pub port: u16,
    pub pid: Option<u32>,
}

pub struct AppState {
    pub ide_server: Mutex<IdeServerState>,
    pub ide_server_process: Mutex<Option<std::process::Child>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            ide_server: Mutex::new(IdeServerState {
                running: false,
                port: 3001,
                pid: None,
            }),
            ide_server_process: Mutex::new(None),
        }
    }
}

#[command]
pub async fn start_ide_server(state: State<'_, AppState>) -> Result<IdeServerState, String> {
    let mut server = state.ide_server.lock().map_err(|e| e.to_string())?;
    if server.running {
        return Ok(server.clone());
    }

    let sidecar = super::ideia_sidecar::spawn_ide_server(server.port).map_err(|e| e.to_string())?;

    server.running = true;
    server.pid = Some(sidecar.id());

    let mut process = state.ide_server_process.lock().map_err(|e| e.to_string())?;
    *process = Some(sidecar);

    Ok(server.clone())
}

#[command]
pub async fn stop_ide_server(state: State<'_, AppState>) -> Result<IdeServerState, String> {
    let mut process = state.ide_server_process.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = process.take() {
        child.kill().map_err(|e| format!("Failed to kill IDE server: {}", e))?;
        child.wait().ok();
    }

    let mut server = state.ide_server.lock().map_err(|e| e.to_string())?;
    server.running = false;
    server.pid = None;

    Ok(server.clone())
}

#[command]
pub async fn ide_server_status(state: State<'_, AppState>) -> Result<IdeServerState, String> {
    let server = state.ide_server.lock().map_err(|e| e.to_string())?;
    Ok(server.clone())
}

#[derive(Serialize)]
pub struct SystemInfo {
    pub platform: String,
    pub arch: String,
    pub os_version: String,
    pub hostname: String,
    pub total_memory_mb: u64,
}

#[command]
pub async fn get_system_info() -> Result<SystemInfo, String> {
    Ok(SystemInfo {
        platform: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        os_version: std::env::consts::OS.to_string(),
        hostname: hostname::get()
            .map(|h| h.to_string_lossy().to_string())
            .unwrap_or_else(|_| "unknown".to_string()),
        total_memory_mb: 0,
    })
}

#[command]
pub async fn open_external(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| format!("Failed to open URL: {}", e))
}

#[command]
pub async fn show_in_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    Ok(())
}
