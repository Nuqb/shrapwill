use crate::{
    jobs::job,
    preview_jobs::{self, PreviewRequest},
    session::changed,
    state::*,
};
use cutline_core::media::{self, Cancel};
use std::{path::Path, sync::atomic::Ordering};
use tauri::Manager;

struct ImportBatch<'a> {
    app: &'a tauri::AppHandle,
    project: String,
    cancel: &'a Cancel,
}
struct ImportOutcome {
    ids: Vec<String>,
    errors: Vec<String>,
}
impl ImportBatch<'_> {
    fn prepare(&self, ids: Vec<String>, quality: u32) {
        let state = self.app.state::<AppState>();
        let s = state.session.lock().unwrap();
        if ids.is_empty()
            || s.editor.project.id != self.project
            || self.cancel.load(Ordering::Relaxed)
            || state.closing.load(Ordering::Relaxed)
        {
            return;
        }
        preview_jobs::start(
            self.app.clone(),
            PreviewRequest {
                project: s.editor.project.clone(),
                quality,
                media_ids: Some(ids),
                force_proxy: false,
            },
        );
    }

    fn one(&self, path: &str) -> Result<Option<String>, String> {
        let state = self.app.state::<AppState>();
        {
            let s = state.session.lock().unwrap();
            if s.editor.project.id != self.project || self.cancel.load(Ordering::Relaxed) {
                return Err("Cancelled".into());
            }
            if s.editor
                .project
                .assets
                .iter()
                .any(|a| media::same_path(Path::new(&a.path), Path::new(path)))
            {
                return Ok(None);
            }
        }
        let asset = media::probe(&state.ffprobe, Path::new(path), self.cancel)?;
        let mut s = state.session.lock().unwrap();
        if s.editor.project.id != self.project || self.cancel.load(Ordering::Relaxed) {
            return Err("Cancelled".into());
        }
        if s.editor.project.assets.iter().any(|a| a.path == asset.path) {
            return Ok(None);
        }
        let id = asset.id.clone();
        let mut project = s.editor.project.clone();
        project.assets.push(asset);
        s.editor.commit(project)?;
        changed(self.app, &mut s)?;
        Ok(Some(id))
    }
    fn run(&self, paths: &[String], progress: &dyn Fn(f64)) -> Result<ImportOutcome, String> {
        let mut ids = vec![];
        let mut errors = vec![];
        for (index, path) in paths.iter().enumerate() {
            match self.one(path) {
                Ok(Some(id)) => ids.push(id),
                Ok(None) => {}
                Err(error) if error == "Cancelled" => return Err(error),
                Err(error) => errors.push(format!(
                    "{}: {error}",
                    Path::new(path)
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                )),
            }
            progress((index + 1) as f64 / paths.len() as f64);
        }
        Ok(ImportOutcome { ids, errors })
    }
}
pub(crate) fn start(app: tauri::AppHandle, paths: Vec<String>, quality: u32) -> String {
    let project = app
        .state::<AppState>()
        .session
        .lock()
        .unwrap()
        .editor
        .project
        .id
        .clone();
    let label = format!(
        "Adding {} file{}",
        paths.len(),
        if paths.len() == 1 { "" } else { "s" }
    );
    job(app, "import", label, move |app, cancel, progress| {
        let batch = ImportBatch {
            app,
            project: project.clone(),
            cancel,
        };
        let ImportOutcome { ids, errors } = batch.run(&paths, progress)?;
        batch.prepare(ids, quality);
        if errors.is_empty() {
            Ok(None)
        } else {
            Err(errors.join("\n"))
        }
    })
}
