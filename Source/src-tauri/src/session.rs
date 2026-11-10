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
        render: render::plan(&s.editor.project, true)
            .ok()
            .and_then(|p| serde_json::to_value(p).ok()),
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
pub(crate) fn changed(app: &tauri::AppHandle, s: &mut Session) -> Result<Snapshot, String> {
    prepare(app, s)?;
    let snap = snapshot(s);
    app.emit("editor-changed", &snap)
        .map_err(|e| e.to_string())?;
    Ok(snap)
}
