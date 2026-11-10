use crate::state::*;
use cutline_core::render;
use tauri::{Emitter, Manager};

pub(crate) fn snapshot(s: &Session) -> Snapshot {
    let (u, r) = s.editor.history();
    Snapshot {
        project: s.editor.project.clone(),
        path: s.path.clone(),
        dirty: s.editor.dirty,
        revision: s.editor.revision,
        can_undo: u,
        can_redo: r,
        can_paste: s.editor.can_paste(),
        render: render::plan(&s.editor.project, true).ok(),
        session_id: s.updates.session_id.clone(),
        sequence: s.updates.sequence,
    }
}
pub(crate) fn prepare(app: &tauri::AppHandle, s: &mut Session) -> Result<(), String> {
    let state = app.state::<AppState>();
    render::prepare_titles(&mut s.editor.project, &state.cache)?;
    for a in &s.editor.project.assets {
        for path in [
            Some(&a.path),
            a.preview_path.as_ref(),
            a.thumbnail_path.as_ref(),
        ]
        .into_iter()
        .flatten()
        {
            app.asset_protocol_scope()
                .allow_file(path)
                .map_err(|e| e.to_string())?;
        }
    }
    for c in s.editor.project.tracks.iter().flat_map(|t| &t.clips) {
        if let Some(path) = c.title.as_ref().and_then(|t| t.image_path.as_ref()) {
            app.asset_protocol_scope()
                .allow_file(path)
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
pub(crate) fn changed(app: &tauri::AppHandle, s: &mut Session) -> Result<(), String> {
    prepare(app, s)?;
    let snap = snapshot(s);
    let update = s.updates.publish(snap);
    app.emit("editor-changed", &update)
        .map_err(|e| e.to_string())?;
    Ok(())
}
pub(crate) fn response(session: &Session, compact: Option<bool>) -> serde_json::Value {
    let snap = session.updates.current().expect("published snapshot");
    if compact == Some(true) {
        serde_json::json!({"updateSequence":snap.sequence,"sessionId":snap.session_id})
    } else {
        serde_json::to_value(snap).expect("serializable editor snapshot")
    }
}
