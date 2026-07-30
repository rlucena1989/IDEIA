use std::path::PathBuf;
use std::process::{Child, Command};

pub fn spawn_ide_server(port: u16) -> Result<Child, String> {
    let ideia_bin = find_ideia_binary()?;

    Command::new(&ideia_bin)
        .args(["ide", "--port", &port.to_string(), "--host", "127.0.0.1"])
        .spawn()
        .map_err(|e| format!("Failed to start IDE server: {}", e))
}

fn find_ideia_binary() -> Result<PathBuf, String> {
    let candidates = vec![
        PathBuf::from("../node_modules/.bin/ideia"),
        PathBuf::from("resources/ideia"),
        PathBuf::from("ideia"),
    ];

    if let Ok(exe_dir) = std::env::current_exe() {
        if let Some(parent) = exe_dir.parent() {
            let bundled = parent.join("resources/ideia");
            if bundled.exists() {
                return Ok(bundled);
            }
        }
    }

    for candidate in &candidates {
        if candidate.exists() {
            return Ok(candidate.clone());
        }
    }

    Err("IDEIA binary not found. Ensure it is installed or bundled.".to_string())
}
