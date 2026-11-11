use crate::{jobs::job, session::*, state::*};
use cutline_core::{
    media::{self},
    Edit,
};
use std::path::{Path, PathBuf};
use tauri::{Manager, State};

#[tauri::command]
pub(crate) fn import_media(
    app: tauri::AppHandle,
    paths: Vec<String>,
    quality: u32,
) -> Result<String, String> {
    if paths.is_empty() || paths.len() > 200 {
        return Err("Choose between 1 and 200 files per import.".into());
    }
    Ok(crate::imports::start(app, paths, quality))
}
#[tauri::command]
pub(crate) fn prepare_preview(
    app: tauri::AppHandle,
    state: State<AppState>,
    quality: u32,
    media_ids: Option<Vec<String>>,
) -> String {
    crate::preview_jobs::start(
        app,
        crate::preview_jobs::PreviewRequest {
            project: state.session.lock().unwrap().editor.project.clone(),
            quality,
            media_ids,
            force_proxy: false,
        },
    )
}
#[tauri::command]
pub(crate) fn prepare_compatible_preview(
    app: tauri::AppHandle,
    state: State<AppState>,
    quality: u32,
    media_ids: Option<Vec<String>>,
) -> String {
    crate::preview_jobs::start(
        app,
        crate::preview_jobs::PreviewRequest {
            project: state.session.lock().unwrap().editor.project.clone(),
            quality,
            media_ids,
            force_proxy: true,
        },
    )
}
pub(crate) fn trim_cache(state: &AppState) {
    trim_cache_protecting(state, &[]);
}
pub(crate) fn trim_cache_protecting(state: &AppState, extra: &[PathBuf]) {
    let s = state.session.lock().unwrap();
    let mut protected = s
        .editor
        .project
        .assets
        .iter()
        .filter_map(|a| a.preview_path.as_ref().map(PathBuf::from))
        .collect::<Vec<_>>();
    let project = &s.editor.project;
    for c in project
        .tracks
        .iter()
        .flat_map(|t| &t.clips)
        .filter(|c| c.props.audio.needs_processing())
    {
        let Some(asset) = project
            .assets
            .iter()
            .find(|a| Some(&a.id) == c.media_id.as_ref())
        else {
            continue;
        };
        if let Ok(path) = media::audio::cache_path(
            Path::new(&asset.path),
            (c.source_in, project.fps.seconds(c.duration)),
            &c.props.audio,
            &state.cache,
        ) {
            protected.push(path);
        }
    }
    protected.extend_from_slice(extra);
    drop(s);
    media::evict_cache(&state.cache, &protected, 10 * 1024 * 1024 * 1024);
}
#[tauri::command]
pub(crate) fn relink_media(
    app: tauri::AppHandle,
    state: State<AppState>,
    media_id: String,
    path: String,
    quality: u32,
) -> String {
    let projectid = state.session.lock().unwrap().editor.project.id.clone();
    job(
        app,
        "relink",
        "Relinking media".into(),
        move |app, cancel, progress| {
            let state = app.state::<AppState>();
            let a = media::probe(&state.ffprobe, Path::new(&path), cancel)?;
            let asset = media::prepare(
                &state.ffmpeg,
                &state.cache,
                a,
                quality.clamp(360, 1080),
                cancel,
                progress,
            )?;
            let mut s = state.session.lock().unwrap();
            if s.editor.project.id != projectid {
                return Err("Cancelled".into());
            }
            s.editor.apply(Edit::Relink { media_id, asset })?;
            changed(app, &mut s)?;
            Ok(None)
        },
    )
}
