use crate::{jobs::job, state::*};
use cutline_core::{media::ExportSettings, render};
use std::path::Path;
use tauri::{Manager, State};

#[tauri::command]
pub(crate) async fn analyze_transition_frame(
    state: State<'_, AppState>,
    frame: render::AnalysisFrame,
) -> Result<serde_json::Value, String> {
    let cache = state.cache.clone();
    tauri::async_runtime::spawn_blocking(move || render::analyze_frame(&cache, frame))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub(crate) fn preview_preset(
    app: tauri::AppHandle,
    state: State<AppState>,
    options: render::DemoOptions,
) -> Result<render::RenderPlan, String> {
    let settings = {
        let session = state.session.lock().unwrap();
        let project = &session.editor.project;
        cutline_core::Project {
            width: project.width,
            height: project.height,
            fps: project.fps.clone(),
            ..Default::default()
        }
    };
    let plan = render::preset_demo(&settings, &state.cache, options)?;
    for clip in &plan.clips {
        app.asset_protocol_scope()
            .allow_file(&clip.source)
            .map_err(|e| e.to_string())?;
    }
    Ok(plan)
}

#[tauri::command]
pub(crate) fn preview_title(
    app: tauri::AppHandle,
    state: State<AppState>,
    style: String,
) -> Result<render::RenderPlan, String> {
    // Build with the same defaults and editing rules, outside the user's session/history.
    let mut project = state.session.lock().unwrap().editor.project.clone();
    project.assets.clear();
    project.tracks.clear();
    project.magnetic_timeline = false;
    let mut editor = cutline_core::Editor::new(project);
    editor.apply(cutline_core::Edit::AddTitle {
        track_id: String::new(),
        start: 0,
        style,
    })?;
    render::prepare_titles(&mut editor.project, &state.cache)?;
    let plan = render::plan(&editor.project, true)?;
    for clip in &plan.clips {
        app.asset_protocol_scope()
            .allow_file(&clip.source)
            .map_err(|e| e.to_string())?;
    }
    Ok(plan)
}

#[tauri::command]
pub(crate) fn start_export(
    app: tauri::AppHandle,
    state: State<AppState>,
    path: String,
    settings: ExportSettings,
) -> Result<String, String> {
    let mut p = state.session.lock().unwrap().editor.project.clone();
    render::prepare_titles(&mut p, &state.cache)?;
    if p.duration() == 0 {
        return Err("Add clips to your timeline before exporting.".into());
    }
    if !state.encoders.lock().unwrap().contains(&settings.encoder) {
        return Err("This encoder is unavailable on your computer.".into());
    }
    Ok(job(
        app,
        "export",
        "Exporting your video".into(),
        move |app, cancel, progress| {
            let state = app.state::<AppState>();
            render::export(
                &state.ffmpeg,
                &p,
                &settings,
                Path::new(&path),
                &state.cache,
                cancel,
                progress,
            )?;
            Ok(Some(path))
        },
    ))
}
#[tauri::command]
pub(crate) fn render_plan(state: State<AppState>) -> Result<render::RenderPlan, String> {
    render::plan(&state.session.lock().unwrap().editor.project, true)
}
#[tauri::command]
pub(crate) fn clip_lut(state: State<AppState>, id: String) -> Result<Vec<f32>, String> {
    let s = state.session.lock().unwrap();
    let (_, c) = s.editor.project.clip(&id).ok_or("Clip not found.")?;
    Ok(render::color_lut(c))
}
