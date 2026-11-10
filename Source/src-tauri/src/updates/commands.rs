use super::*;
use crate::state::AppState;
use tauri::State;
#[tauri::command]
pub(crate) async fn check_for_updates(state: State<'_, AppState>) -> Result<CheckResult, String> {
    let updates = state.updates.clone();
    tauri::async_runtime::spawn_blocking(move || operations::check(&updates))
        .await
        .map_err(|e| e.to_string())?
}
#[tauri::command]
pub(crate) async fn download_app_update(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let updates = state.updates.clone();
    let directory = state.data.join("update-cache");
    tauri::async_runtime::spawn_blocking(move || operations::download(&app, &updates, directory))
        .await
        .map_err(|e| e.to_string())?
}
#[tauri::command]
pub(crate) fn cancel_app_update(state: State<AppState>) {
    state.updates.cancel.store(true, Ordering::Release);
}
#[tauri::command]
pub(crate) async fn install_app_update(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    discard_unsaved: bool,
) -> Result<Mode, String> {
    let updates = state.updates.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let _operation = updates.begin()?;
        let ready = updates
            .pending
            .lock()
            .map_err(|e| e.to_string())?
            .ready
            .clone()
            .ok_or("Download the update first.")?;
        let (mode, root) = installation()?;
        if ready.mode != mode {
            return Err("The application location changed. Check for updates again.".into());
        }
        if mode == Mode::Portable {
            operations::install_portable(&updates, &ready, &root)?;
        } else if mode == Mode::Installed {
            shrapwill_updater::network::verify_file(&ready.file, &ready.release.installer)?;
            handoff::start(&app, &ready.file, true, discard_unsaved)?;
        } else {
            return Err(
                "Use a Shrapwill installer or portable launcher to install updates.".into(),
            );
        }
        Ok(mode)
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
pub(crate) async fn restart_for_update(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    discard_unsaved: bool,
) -> Result<(), String> {
    let updates = state.updates.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let _operation = updates.begin()?;
        let target = updates
            .pending
            .lock()
            .map_err(|e| e.to_string())?
            .restart
            .clone()
            .ok_or("Install the update before restarting.")?;
        handoff::start(&app, &target, false, discard_unsaved)
    })
    .await
    .map_err(|e| e.to_string())?
}
