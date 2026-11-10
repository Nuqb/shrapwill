use crate::state::*;
use cutline_core::{
    media::{self},
    Editor,
};
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    sync::{atomic::AtomicBool, Arc, Condvar, Mutex},
};
use tauri::{Emitter, Manager};

fn tool_path(name: &str) -> PathBuf {
    let exe = std::env::current_exe().unwrap_or_default();
    let sibling = exe
        .parent()
        .unwrap_or(Path::new("."))
        .join(format!("{name}.exe"));
    if sibling.is_file() {
        return sibling;
    }
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("binaries")
        .join(format!("{name}-x86_64-pc-windows-msvc.exe"))
}

pub(crate) fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let portable = std::env::var_os("CUTLINE_HOME").map(PathBuf::from);
    let cache = portable
        .as_ref()
        .map(|p| p.join("cache"))
        .unwrap_or(app.path().app_cache_dir()?.join("media"));
    let data = portable
        .map(|p| p.join("data"))
        .unwrap_or(app.path().app_data_dir()?);
    fs::create_dir_all(&cache)?;
    fs::create_dir_all(&data)?;
    let ffmpeg = tool_path("ffmpeg");
    let ffprobe = tool_path("ffprobe");
    app.manage(AppState {
        session: Mutex::new(Session {
            editor: Editor::default(),
            path: None,
        }),
        jobs: Mutex::new(HashMap::new()),
        slots: (Mutex::new(0), Condvar::new()),
        import_slots: (Mutex::new(0), Condvar::new()),
        cache,
        data,
        ffmpeg,
        ffprobe,
        encoders: Mutex::new(vec!["software".into()]),
        closing: AtomicBool::new(false),
    });
    probe_encoders(app.handle().clone());
    let handle = app.handle().clone();
    app.get_webview_window("main")
        .unwrap()
        .on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = handle.emit("close-requested", ());
            }
        });
    Ok(())
}

fn probe_encoders(handle: tauri::AppHandle) {
    std::thread::spawn(move || {
        let state = handle.state::<AppState>();
        for encoder in ["h264_nvenc", "h264_qsv", "h264_amf"] {
            let c = Arc::new(AtomicBool::new(false));
            let test = media::capture(
                &state.ffmpeg,
                &media::strings(&[
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-f",
                    "lavfi",
                    "-i",
                    "color=s=128x128:d=0.1",
                    "-frames:v",
                    "1",
                    "-c:v",
                    encoder,
                    "-f",
                    "null",
                    "-",
                ]),
                &c,
                65536,
            );
            if test.is_ok() {
                state.encoders.lock().unwrap().push(encoder.into());
            }
        }
        let _ = handle.emit("encoders", state.encoders.lock().unwrap().clone());
    });
}
