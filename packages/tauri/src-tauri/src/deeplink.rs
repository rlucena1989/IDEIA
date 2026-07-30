use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use url::Url;

#[derive(Debug, Serialize, Deserialize)]
pub struct DeepLinkAction {
    pub action: String,
    pub params: std::collections::HashMap<String, String>,
}

pub fn parse_deeplink(url: &str) -> Result<DeepLinkAction, String> {
    let parsed = Url::parse(url).map_err(|e| format!("Invalid URL: {}", e))?;

    let action = parsed.host_str().unwrap_or("open").to_string();
    let params: std::collections::HashMap<String, String> =
        parsed.query_pairs().map(|(k, v)| (k.to_string(), v.to_string())).collect();

    Ok(DeepLinkAction { action, params })
}

pub fn setup_deeplink(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let handle = app.clone();

    app.listen("deep-link", move |event| {
        if let Ok(action) = parse_deeplink(&event.payload().to_string()) {
            match action.action.as_str() {
                "open" => {
                    if let Some(path) = action.params.get("path") {
                        handle.emit("open-project", path.clone()).ok();
                    }
                }
                "settings" => {
                    handle.emit("open-settings", ()).ok();
                }
                _ => {}
            }
        }
    });

    Ok(())
}
