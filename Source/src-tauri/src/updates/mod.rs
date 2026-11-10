mod commands;
mod handoff;
mod operations;
pub(crate) use commands::*;
use serde::{Deserialize, Serialize};
use shrapwill_updater::manifest::Release;
use std::{
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
};

#[derive(Deserialize)]
pub(crate) struct Config {
    pub repository: String,
    #[serde(rename = "publicKey")]
    pub public_key: String,
}
pub(crate) fn config() -> Result<Config, String> {
    serde_json::from_str(include_str!("../../../config/updates.json"))
        .map_err(|_| "Update configuration is unavailable.".into())
}
#[derive(Clone, Copy, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum Mode {
    Portable,
    Installed,
    Manual,
}
pub(crate) fn installation() -> Result<(Mode, PathBuf), String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    if let Some(root) = shrapwill_updater::portable::root(&exe) {
        return Ok((Mode::Portable, root));
    }
    let root = exe
        .parent()
        .ok_or("Application location is unavailable.")?
        .to_path_buf();
    Ok((
        if root.join("uninstall.exe").is_file() {
            Mode::Installed
        } else {
            Mode::Manual
        },
        root,
    ))
}
#[derive(Clone)]
pub(crate) struct Ready {
    pub release: Release,
    pub file: PathBuf,
    pub mode: Mode,
}
#[derive(Default)]
pub(crate) struct Pending {
    pub release: Option<Release>,
    pub ready: Option<Ready>,
    pub restart: Option<PathBuf>,
}
#[derive(Default)]
pub(crate) struct UpdateState {
    pub busy: AtomicBool,
    pub cancel: Arc<AtomicBool>,
    pub pending: Mutex<Pending>,
}
pub(crate) struct Operation<'a>(&'a UpdateState);
impl UpdateState {
    pub fn begin(&self) -> Result<Operation<'_>, String> {
        self.busy
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .map_err(|_| "An update operation is already running.")?;
        self.cancel.store(false, Ordering::Release);
        Ok(Operation(self))
    }
}
impl Drop for Operation<'_> {
    fn drop(&mut self) {
        self.0.busy.store(false, Ordering::Release);
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct UpdateInfo {
    pub version: String,
    pub notes: String,
    pub bytes: u64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CheckResult {
    pub current_version: &'static str,
    pub mode: Mode,
    pub feed_available: bool,
    pub available: Option<UpdateInfo>,
}
impl UpdateInfo {
    fn from_release(release: &Release, mode: Mode) -> Self {
        Self {
            version: release.version.clone(),
            notes: release.notes.clone(),
            bytes: if mode == Mode::Portable {
                release.portable.size
            } else {
                release.installer.size
            },
        }
    }
}
