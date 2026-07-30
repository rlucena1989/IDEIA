use tauri::Manager;
use tauri_plugin_updater::UpdaterExt;

pub async fn check_for_updates(app: &tauri::AppHandle) -> Result<String, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    let response = updater
        .check()
        .await
        .map_err(|e| format!("Update check failed: {}", e))?;

    if let Some(update) = &response.latest_version {
        Ok(format!("Update available: {}", update))
    } else {
        Ok("No updates available.".to_string())
    }
}
