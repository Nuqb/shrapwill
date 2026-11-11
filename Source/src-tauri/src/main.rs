#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
//! Desktop entry point. IPC, persistence, jobs, and startup live in focused modules.
mod commands;
mod imports;
mod jobs;
mod preview_jobs;
mod project_store;
mod retiming;
mod runtime;
mod session;
mod state;
mod updates;
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(runtime::setup)
        .invoke_handler(tauri::generate_handler![
            updates::check_for_updates,
            updates::download_app_update,
            updates::cancel_app_update,
            updates::install_app_update,
            updates::restart_for_update,
            commands::audio::prepare_audio,
            commands::editing::startup,
            commands::editing::editor_snapshot,
            commands::editing::edit,
            commands::editing::retime_clip,
            commands::editing::history,
            commands::editing::clipboard,
            commands::projects::new_project,
            commands::projects::open_project,
            commands::projects::recover_project,
            commands::projects::save,
            commands::projects::autosave,
            commands::projects::discard_recovery,
            commands::lifecycle::close_editor,
            commands::lifecycle::cancel_job,
            commands::media::import_media,
            commands::media::prepare_preview,
            commands::media::prepare_compatible_preview,
            commands::media::relink_media,
            commands::render::start_export,
            commands::render::render_plan,
            commands::render::preview_title,
            commands::render::preview_preset,
            commands::render::clip_lut,
            commands::render::analyze_transition_frame
        ])
        .run(tauri::generate_context!())
        .expect("Shrapwill could not start");
}
