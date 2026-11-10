use crate::{jobs::job, session::changed, state::*};
use cutline_core::{media, MediaAsset, Project};
use std::sync::atomic::Ordering;
use tauri::Manager;

pub(crate) struct PreviewRequest {
    pub project: Project,
    pub quality: u32,
    pub media_ids: Option<Vec<String>>,
    pub force_proxy: bool,
}
fn still_present(state: &AppState, project: &str, asset: &MediaAsset) -> bool {
    let s = state.session.lock().unwrap();
    !state.closing.load(Ordering::Relaxed)
        && s.editor.project.id == project
        && s.editor
            .project
            .assets
            .iter()
            .any(|a| a.id == asset.id && a.path == asset.path)
}
fn publish(
    app: &tauri::AppHandle,
    request: &PreviewRequest,
    prepared: MediaAsset,
) -> Result<(), String> {
    let state = app.state::<AppState>();
    let mut s = state.session.lock().unwrap();
    if s.editor.project.id != request.project.id {
        return Err("Cancelled".into());
    }
    let Some(asset) = s
        .editor
        .project
        .assets
        .iter_mut()
        .find(|a| a.id == prepared.id && a.path == prepared.path)
    else {
        return Ok(());
    };
    let has_proxy = asset
        .preview_path
        .as_ref()
        .is_some_and(|path| path != &asset.path);
    if request.force_proxy || !has_proxy {
        asset.preview_path = prepared.preview_path;
    }
    asset.thumbnail_path = prepared.thumbnail_path;
    asset.waveform = prepared.waveform;
    changed(app, &mut s)?;
    Ok(())
}
impl PreviewRequest {
    fn label(&self) -> &str {
        let artwork_only = !self.force_proxy
            && self
                .assets()
                .iter()
                .all(|asset| asset.preview_path.as_deref() == Some(asset.path.as_str()));
        if artwork_only {
            "Preparing thumbnails and waveforms"
        } else {
            "Preparing compatible playback and waveforms"
        }
    }

    fn assets(&self) -> Vec<&MediaAsset> {
        self.project
            .assets
            .iter()
            .filter(|asset| {
                !asset.missing
                    && self
                        .media_ids
                        .as_ref()
                        .is_none_or(|ids| ids.contains(&asset.id))
            })
            .collect()
    }
}
pub(crate) fn start(app: tauri::AppHandle, request: PreviewRequest) -> String {
    let label = request.label().into();
    job(app, "preview", label, move |app, cancel, progress| {
        let state = app.state::<AppState>();
        let assets = request.assets();
        for (index, asset) in assets.iter().enumerate() {
            if cancel.load(Ordering::Relaxed) {
                return Err("Cancelled".into());
            }
            if !still_present(&state, &request.project.id, asset) {
                continue;
            }
            let mut input = (*asset).clone();
            if request.force_proxy {
                input.preview_path = None;
            }
            let prepared = media::prepare(
                &state.ffmpeg,
                &state.cache,
                input,
                request.quality.clamp(360, 1080),
                cancel,
                &|v| progress((index as f64 + v) / assets.len().max(1) as f64),
            )?;
            publish(app, &request, prepared)?;
        }
        super::commands::media::trim_cache(&state);
        Ok(None)
    })
}
