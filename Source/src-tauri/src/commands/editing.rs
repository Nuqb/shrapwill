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
) -> Result<Snapshot, String> {
    let mut s = state.session.lock().unwrap();
    s.editor.apply(operation)?;
    changed(&app, &mut s)
}
#[tauri::command]
pub(crate) fn history(
    app: tauri::AppHandle,
    state: State<AppState>,
    direction: String,
) -> Result<Snapshot, String> {
    let mut s = state.session.lock().unwrap();
    if direction == "undo" {
        s.editor.undo()
    } else if direction == "redo" {
        s.editor.redo()
    } else {
        return Err("Unknown history action.".into());
    }
    changed(&app, &mut s)
}
#[tauri::command]
pub(crate) fn clipboard(
    app: tauri::AppHandle,
    state: State<AppState>,
    direction: String,
    ids: Vec<String>,
    frame: i64,
) -> Result<serde_json::Value, String> {
    let mut s = state.session.lock().unwrap();
    let selected = s.editor.clipboard_action(&direction, &ids, frame)?;
    let snap = changed(&app, &mut s)?;
    Ok(serde_json::json!({"snapshot":snap,"selected":selected}))
}
