use super::*;
use base64::{engine::general_purpose::STANDARD, Engine};
use shrapwill_updater::{manifest, network};
use std::{
    cell::Cell,
    fs,
    time::{Duration, Instant},
};
use tauri::Emitter;

pub(crate) fn check(state: &UpdateState) -> Result<CheckResult, String> {
    let _operation = state.begin()?;
    let config = config()?;
    let (mode, _) = installation()?;
    let bytes = network::manifest(&config.repository)?;
    let feed_available = bytes.is_some();
    let release = bytes
        .map(|bytes| {
            let key = STANDARD
                .decode(&config.public_key)
                .map_err(|_| "Invalid public update key.")?;
            manifest::verify(&bytes, &key, &config.repository)
        })
        .transpose()?;
    let release = release
        .filter(|release| manifest::newer(release, env!("CARGO_PKG_VERSION")).unwrap_or(false));
    let available = release
        .as_ref()
        .map(|release| UpdateInfo::from_release(release, mode));
    state.pending.lock().map_err(|e| e.to_string())?.release = release;
    Ok(CheckResult {
        current_version: env!("CARGO_PKG_VERSION"),
        mode,
        feed_available,
        available,
    })
}
pub(crate) fn download(
    app: &tauri::AppHandle,
    state: &UpdateState,
    directory: PathBuf,
) -> Result<(), String> {
    let _operation = state.begin()?;
    let release = state
        .pending
        .lock()
        .map_err(|e| e.to_string())?
        .release
        .clone()
        .ok_or("Check for an update first.")?;
    let (mode, _) = installation()?;
    if mode == Mode::Manual {
        return Err("Install Shrapwill with its installer or portable launcher before using in-app updates.".into());
    }
    let ready = Ready {
        release,
        file: download_location(&directory, mode)?,
        mode,
    };
    let outcome = fetch(app, state, &ready);
    if let Err(error) = outcome {
        if let Some(parent) = ready.file.parent() {
            let _ = fs::remove_dir(parent);
        }
        return Err(error);
    }
    let previous = state
        .pending
        .lock()
        .map_err(|e| e.to_string())?
        .ready
        .replace(ready);
    if let Some(previous) = previous {
        remove_download(&previous.file);
    }
    Ok(())
}
fn download_location(cache: &std::path::Path, mode: Mode) -> Result<PathBuf, String> {
    fs::create_dir_all(cache).map_err(|e| e.to_string())?;
    let directory = cache.join(format!("update-{}", uuid::Uuid::new_v4().simple()));
    fs::create_dir(&directory).map_err(|e| e.to_string())?;
    Ok(directory.join(if mode == Mode::Portable {
        "release.shrapwill.gz"
    } else {
        "installer.exe"
    }))
}
fn fetch(app: &tauri::AppHandle, state: &UpdateState, ready: &Ready) -> Result<(), String> {
    let artifact = if ready.mode == Mode::Portable {
        &ready.release.portable
    } else {
        &ready.release.installer
    };
    let last = Cell::new(Instant::now() - Duration::from_secs(1));
    network::download(artifact, &ready.file, &state.cancel, |downloaded, total| {
        if last.get().elapsed() > Duration::from_millis(100) || downloaded == total {
            last.set(Instant::now());
            let _ = app.emit("app-update-progress", serde_json::json!({"version":ready.release.version,"downloaded":downloaded,"total":total}));
        }
    })
}
pub(crate) fn install_portable(
    state: &UpdateState,
    ready: &Ready,
    root: &std::path::Path,
) -> Result<(), String> {
    let nonce = uuid::Uuid::new_v4().simple().to_string();
    let release = shrapwill_updater::portable::stage(
        root,
        &ready.file,
        shrapwill_updater::portable::Stage {
            artifact: &ready.release.portable,
            version: &ready.release.version,
            nonce: &nonce,
            cancel: &state.cancel,
        },
    )?;
    let reference = shrapwill_updater::portable::reference(root, &release)?;
    let launcher_path = release.join("shrapwill-launcher.exe");
    if fs::metadata(&launcher_path)
        .map_err(|e| e.to_string())?
        .len()
        > 4 * 1024 * 1024
    {
        return Err("Invalid portable launcher size.".into());
    }
    let launcher = fs::read(&launcher_path).map_err(|e| e.to_string())?;
    cutline_core::model::atomic_write(&root.join("shrapwill.exe"), &launcher)?;
    cutline_core::model::atomic_write(
        &root.join("current-release.txt"),
        format!("{reference}\n").as_bytes(),
    )?;
    let mut pending = state.pending.lock().map_err(|e| e.to_string())?;
    pending.restart = Some(release.join("shrapwill.exe"));
    pending.ready = None;
    remove_download(&ready.file);
    Ok(())
}
fn remove_download(file: &std::path::Path) {
    // Only files created by this updater are passed here; remove_dir is nonrecursive.
    if fs::remove_file(file).is_ok() {
        if let Some(parent) = file.parent() {
            let _ = fs::remove_dir(parent);
        }
    }
}
