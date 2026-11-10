use super::lifecycle::cancel_all;
use crate::{project_store::*, session::*, state::*};
use cutline_core::{self as core, Editor, Project};
use std::{fs, path::Path, sync::atomic::Ordering};
use tauri::State;

#[tauri::command]
pub(crate) fn new_project(
    app: tauri::AppHandle,
    state: State<AppState>,
    name: String,
    width: u32,
    height: u32,
    fps: core::FrameRate,
    compact: Option<bool>,
) -> Result<serde_json::Value, String> {
    let p = Project {
        name: if name.trim().is_empty() {
            "Untitled project".into()
        } else {
            name
        },
        width,
        height,
        fps,
        ..Default::default()
    };
    p.validate()?;
    cancel_all(&state);
    let mut s = state.session.lock().unwrap();
    let next_revision = s.editor.revision + 1;
    s.editor = Editor::new(p);
    s.updates.reset_session();
    s.editor.revision = next_revision;
    s.path = None;
    let _ = fs::remove_file(state.data.join("recovery.cutline"));
    changed(&app, &mut s).map(|_| response(&s, compact))
}
#[tauri::command]
pub(crate) fn open_project(
    app: tauri::AppHandle,
    state: State<AppState>,
    path: String,
    compact: Option<bool>,
) -> Result<serde_json::Value, String> {
    let p = read_project(Path::new(&path))?;
    cancel_all(&state);
    let mut s = state.session.lock().unwrap();
    remember(&state, &p.name, &path);
    let next_revision = s.editor.revision + 1;
    s.editor = Editor::new(p);
    s.updates.reset_session();
    s.editor.revision = next_revision;
    s.path = Some(path);
    let _ = fs::remove_file(state.data.join("recovery.cutline"));
    changed(&app, &mut s).map(|_| response(&s, compact))
}
#[tauri::command]
pub(crate) fn recover_project(
    app: tauri::AppHandle,
    state: State<AppState>,
    compact: Option<bool>,
) -> Result<serde_json::Value, String> {
    let p = read_project(&state.data.join("recovery.cutline"))?;
    let mut s = state.session.lock().unwrap();
    let next_revision = s.editor.revision + 1;
    s.editor = Editor::new(p);
    s.updates.reset_session();
    s.editor.revision = next_revision;
    s.editor.dirty = true;
    s.path = None;
    changed(&app, &mut s).map(|_| response(&s, compact))
}
#[tauri::command]
pub(crate) fn save(
    app: tauri::AppHandle,
    state: State<AppState>,
    path: Option<String>,
    compact: Option<bool>,
) -> Result<serde_json::Value, String> {
    let mut s = state.session.lock().unwrap();
    let path = path
        .or_else(|| s.path.clone())
        .ok_or("Choose a location for this project.")?;
    save_project(&s.editor.project, Path::new(&path))?;
    s.path = Some(path.clone());
    s.editor.dirty = false;
    remember(&state, &s.editor.project.name, &path);
    let _ = fs::remove_file(state.data.join("recovery.cutline"));
    changed(&app, &mut s).map(|_| response(&s, compact))
}
#[tauri::command]
pub(crate) fn autosave(state: State<AppState>) -> Result<(), String> {
    if state.closing.load(Ordering::Acquire) {
        return Ok(());
    }
    let s = state.session.lock().unwrap();
    if s.editor.dirty {
        core::model::atomic_write(
            &state.data.join("recovery.cutline"),
            &serde_json::to_vec(&s.editor.project).map_err(|e| e.to_string())?,
        )?
    }
    Ok(())
}
#[tauri::command]
pub(crate) fn discard_recovery(state: State<AppState>) {
    let _ = fs::remove_file(state.data.join("recovery.cutline"));
}
