use crate::{project_store::*, session::*, state::*};
use cutline_core::Edit;
use tauri::State;

#[tauri::command]
pub(crate) fn startup(state: State<AppState>) -> Startup {
    let session = state.session.lock().unwrap();
    Startup {
        snapshot: snapshot(&session),
        recents: recents(&state),
        recovery: state.data.join("recovery.cutline").is_file(),
        encoders: state.encoders.lock().unwrap().clone(),
        version: env!("CARGO_PKG_VERSION").into(),
    }
}
#[tauri::command]
pub(crate) fn edit(
    app: tauri::AppHandle,
    state: State<AppState>,
    operation: Edit,
    compact: Option<bool>,
) -> Result<serde_json::Value, String> {
    let mut s = state.session.lock().unwrap();
    ensure_editable(&state)?;
    s.editor.apply(operation)?;
    changed(&app, &mut s).map(|_| response(&s, compact))
}
#[tauri::command]
pub(crate) fn history(
    app: tauri::AppHandle,
    state: State<AppState>,
    direction: String,
    compact: Option<bool>,
) -> Result<serde_json::Value, String> {
    let mut s = state.session.lock().unwrap();
    ensure_editable(&state)?;
    if direction == "undo" {
        s.editor.undo()
    } else if direction == "redo" {
        s.editor.redo()
    } else {
        return Err("Unknown history action.".into());
    }
    changed(&app, &mut s).map(|_| response(&s, compact))
}
#[tauri::command]
pub(crate) fn clipboard(
    app: tauri::AppHandle,
    state: State<AppState>,
    direction: String,
    ids: Vec<String>,
    frame: i64,
    compact: Option<bool>,
) -> Result<serde_json::Value, String> {
    let mut s = state.session.lock().unwrap();
    ensure_editable(&state)?;
    let selected = s.editor.clipboard_action(&direction, &ids, frame)?;
    changed(&app, &mut s)?;
    Ok(serde_json::json!({"snapshot":response(&s, compact),"selected":selected}))
}
#[tauri::command]
pub(crate) fn editor_snapshot(state: State<AppState>) -> Snapshot {
    snapshot(&state.session.lock().unwrap())
}
fn ensure_editable(state: &AppState) -> Result<(), String> {
    if state.closing.load(std::sync::atomic::Ordering::Acquire) {
        return Err("The editor is closing. Wait for Shrapwill to restart.".into());
    }
    Ok(())
}
