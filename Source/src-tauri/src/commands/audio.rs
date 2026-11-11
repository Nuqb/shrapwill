use crate::{jobs::job, state::AppState};
use cutline_core::{media::audio, AudioSettings};
use tauri::Manager;

#[tauri::command]
pub(crate) async fn prepare_audio(
    app: tauri::AppHandle,
    id: String,
    settings: AudioSettings,
) -> Result<String, String> {
    if !settings.valid() {
        return Err("Invalid audio settings.".into());
    }
    let (source, source_in, duration) = clip_audio(&app, &id)?;
    let (sender, receiver) = std::sync::mpsc::sync_channel(1);
    job(
        app,
        "audio",
        "Preparing audio effects".into(),
        move |app, cancel, _progress| {
            let state = app.state::<AppState>();
            let result = audio::prepare(audio::AudioRequest {
                ffmpeg: &state.ffmpeg,
                source: std::path::Path::new(&source),
                source_in,
                duration,
                settings: &settings,
                cache: &state.cache,
                cancel,
            })
            .and_then(|path| {
                super::media::trim_cache_protecting(&state, std::slice::from_ref(&path));
                app.asset_protocol_scope()
                    .allow_file(&path)
                    .map_err(|e| e.to_string())?;
                Ok(path.to_string_lossy().into_owned())
            });
            let _ = sender.send(result.clone());
            result.map(Some)
        },
    );
    tauri::async_runtime::spawn_blocking(move || receiver.recv().map_err(|e| e.to_string())?)
        .await
        .map_err(|e| e.to_string())?
}

fn clip_audio(app: &tauri::AppHandle, id: &str) -> Result<(String, f64, f64), String> {
    let state = app.state::<AppState>();
    let session = state.session.lock().unwrap();
    let project = &session.editor.project;
    let (_, clip) = project
        .clip(id)
        .ok_or("Audio clip is no longer available.")?;
    let asset = project
        .assets
        .iter()
        .find(|a| Some(&a.id) == clip.media_id.as_ref())
        .filter(|a| a.has_audio && !a.missing)
        .ok_or("This clip has no available audio.")?;
    Ok((
        asset.path.clone(),
        clip.source_in,
        project.fps.seconds(clip.duration),
    ))
}
