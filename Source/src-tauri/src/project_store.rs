use crate::state::*;
use cutline_core::{
    self as core,
    media::{self},
    Project,
};
use std::{fs, path::Path};

pub(crate) fn recents(state: &AppState) -> Vec<Recent> {
    fs::read(state.data.join("recent.json"))
        .ok()
        .and_then(|v| serde_json::from_slice(&v).ok())
        .unwrap_or_default()
}
pub(crate) fn remember(state: &AppState, name: &str, path: &str) {
    let mut items = recents(state);
    items.retain(|r| r.path != path);
    items.insert(
        0,
        Recent {
            name: name.into(),
            path: path.into(),
        },
    );
    items.truncate(12);
    let _ = core::model::atomic_write(
        &state.data.join("recent.json"),
        &serde_json::to_vec(&items).unwrap(),
    );
}
pub(crate) fn read_project(path: &Path) -> Result<Project, String> {
    let meta = fs::metadata(path).map_err(|e| e.to_string())?;
    if meta.len() > 32 * 1024 * 1024 {
        return Err("Project is larger than the supported 32 MB.".into());
    }
    let mut p: Project = serde_json::from_slice(&fs::read(path).map_err(|e| e.to_string())?)
        .map_err(|e| format!("Cannot read this project: {e}"))?;
    p.validate()?;
    for a in &mut p.assets {
        if Path::new(&a.path).is_relative() {
            a.path = path
                .parent()
                .unwrap_or(Path::new("."))
                .join(&a.path)
                .to_string_lossy()
                .into_owned()
        }
        a.missing = !Path::new(&a.path).is_file();
        if a.preview_path
            .as_ref()
            .is_some_and(|p| !Path::new(p).is_file())
        {
            a.preview_path = None
        }
        if a.thumbnail_path
            .as_ref()
            .is_some_and(|p| !Path::new(p).is_file())
        {
            a.thumbnail_path = None
        }
    }
    Ok(p)
}
pub(crate) fn save_project(p: &Project, path: &Path) -> Result<(), String> {
    if p.assets
        .iter()
        .any(|a| media::same_path(Path::new(&a.path), path))
    {
        return Err("Save the project separately from your source media.".into());
    }
    let mut portable = p.clone();
    if let Some(parent) = path.parent() {
        for a in &mut portable.assets {
            if let Ok(relative) = Path::new(&a.path).strip_prefix(parent) {
                a.path = relative.to_string_lossy().into_owned();
            }
        }
    }
    core::model::atomic_write(
        path,
        &serde_json::to_vec_pretty(&portable).map_err(|e| e.to_string())?,
    )
}
