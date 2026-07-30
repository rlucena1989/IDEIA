mod commands;
mod ideia_sidecar;
mod tray;
mod updater;
mod deeplink;

use tauri::Manager;
use tauri_plugin_global_shortcut::GlobalShortcutExt;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            tray::setup_tray(app)?;
            deeplink::setup_deeplink(app)?;
            app.global_shortcut().register("Alt+Shift+I")?;
            app.global_shortcut().register("Alt+Shift+A")?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::start_ide_server,
            commands::stop_ide_server,
            commands::ide_server_status,
            commands::get_system_info,
            commands::open_external,
            commands::show_in_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running IDEIA Tauri application");
}
