mod core;
mod file_types;

use core::{DriveInfo, FoundFile};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

/// Estado global compartilhado do aplicativo.
struct AppState {
    cancel_flag: Arc<AtomicBool>,
    scan_results: Mutex<Vec<FoundFile>>,
}

/// Comando Tauri: lista os discos físicos conectados ao Mac.
#[tauri::command]
fn list_drives() -> Result<Vec<DriveInfo>, String> {
    core::list_drives_parsed()
}

/// Comando Tauri: inicia a varredura do disco em thread separada.
/// Usa tauri::async_runtime (já incluso no Tauri) em vez de tokio direto.
#[tauri::command]
async fn start_scan(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    drive_path: String,
) -> Result<Vec<FoundFile>, String> {
    // Resetar o flag de cancelamento
    state.cancel_flag.store(false, Ordering::Relaxed);
    let cancel_flag = state.cancel_flag.clone();

    // Rodar o scan pesado em thread separada para não bloquear a UI
    let result: Result<Vec<FoundFile>, String> =
        tauri::async_runtime::spawn_blocking(move || {
            core::scan_drive_with_events(&app, &drive_path, cancel_flag)
        })
        .await
        .map_err(|e| format!("Erro na thread de scan: {}", e))?;

    if let Ok(ref files) = result {
        let mut lock = state.scan_results.lock().unwrap();
        *lock = files.clone();
    }

    result
}

/// Comando Tauri: cancela o scan corrente.
#[tauri::command]
fn cancel_scan(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.cancel_flag.store(true, Ordering::Relaxed);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            cancel_flag: Arc::new(AtomicBool::new(false)),
            scan_results: Mutex::new(Vec::new()),
        })
        .invoke_handler(tauri::generate_handler![
            list_drives,
            start_scan,
            cancel_scan,
        ])
        .run(tauri::generate_context!())
        .expect("Falha ao iniciar o aplicativo Tauri");
}
