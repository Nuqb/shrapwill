use crate::{commands::lifecycle::cancel_all, state::AppState};
use std::{fs, path::Path, sync::atomic::Ordering};
use tauri::Manager;

pub(crate) fn start(
    app: &tauri::AppHandle,
    target: &Path,
    installer: bool,
    discard_unsaved: bool,
) -> Result<(), String> {
    let target = cutline_core::media::clean_path(target);
    let state = app.state::<AppState>();
    let session = state.session.lock().map_err(|e| e.to_string())?;
    if session.editor.dirty && !discard_unsaved {
        return Err("Save your project before restarting.".into());
    }
    let (_, install_directory) = super::installation()?;
    let install_directory = cutline_core::media::clean_path(&install_directory);
    let helper = prepare_helper(&state)?;
    let hash = shrapwill_updater::network::file_hash(&target)?;
    begin_closing(&state)?;
    let outcome = cutline_core::media::command(&helper)
        .args([
            if installer { "installer" } else { "restart" },
            &std::process::id().to_string(),
            &target.to_string_lossy(),
            &hash,
            &install_directory.to_string_lossy(),
        ])
        .spawn()
        .map_err(|e| e.to_string());
    if let Err(error) = outcome {
        state.closing.store(false, Ordering::Release);
        return Err(error);
    }
    let _ = fs::remove_file(state.data.join("recovery.cutline"));
    cancel_all(&state);
    drop(session);
    app.exit(0);
    Ok(())
}
fn prepare_helper(state: &AppState) -> Result<std::path::PathBuf, String> {
    let directory = state
        .data
        .join("update-cache")
        .join(format!("handoff-{}", uuid::Uuid::new_v4().simple()));
    fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    let helper = directory.join("shrapwill-update-helper.exe");
    write_helper(&helper)?;
    Ok(helper)
}
fn begin_closing(state: &AppState) -> Result<(), String> {
    let jobs = state.jobs.lock().map_err(|e| e.to_string())?;
    if !jobs.is_empty() {
        return Err("Wait for media operations to finish before restarting for an update.".into());
    }
    if state.closing.swap(true, Ordering::AcqRel) {
        return Err("The editor is already closing.".into());
    }
    Ok(())
}
#[cfg(windows)]
fn write_helper(path: &Path) -> Result<(), String> {
    fs::write(
        path,
        include_bytes!(concat!(env!("OUT_DIR"), "/shrapwill-update-helper.exe")),
    )
    .map_err(|e| e.to_string())
}
#[cfg(not(windows))]
fn write_helper(_path: &Path) -> Result<(), String> {
    Err("In-app installation is supported on Windows.".into())
}
