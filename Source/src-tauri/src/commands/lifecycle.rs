use crate::state::*;

use std::{fs, sync::atomic::Ordering};
use tauri::{Manager, State};

#[tauri::command]
pub(crate) fn close_editor(app: tauri::AppHandle, state: State<AppState>) {
    if state.closing.swap(true, Ordering::AcqRel) {
        return;
    }
    let _ = fs::remove_file(state.data.join("recovery.cutline"));
    cancel_all(&state);
    std::thread::spawn(move || {
        for _ in 0..100 {
            if app.state::<AppState>().jobs.lock().unwrap().is_empty() {
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(50));
        }
        app.exit(0);
    });
}
pub(crate) fn cancel_all(state: &AppState) {
    for v in state.jobs.lock().unwrap().values() {
        v.store(true, Ordering::Relaxed)
    }
}
#[tauri::command]
pub(crate) fn cancel_job(state: State<AppState>, id: String) {
    if let Some(v) = state.jobs.lock().unwrap().get(&id) {
        v.store(true, Ordering::Relaxed)
    }
}
