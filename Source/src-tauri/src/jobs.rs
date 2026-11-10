//! Bounded local worker queue and a single job-event serialization boundary.
use crate::state::{AppState, JobEvent};
use cutline_core::media::Cancel;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use tauri::{Emitter, Manager};

type JobResult = Result<Option<String>, String>;
struct JobRunner {
    app: tauri::AppHandle,
    id: String,
    kind: String,
    label: String,
    cancel: Cancel,
}

pub(crate) fn job(
    app: tauri::AppHandle,
    kind: &str,
    label: String,
    task: impl FnOnce(&tauri::AppHandle, &Cancel, &dyn Fn(f64)) -> JobResult + Send + 'static,
) -> String {
    let id = cutline_core::model::id();
    let cancel = Arc::new(AtomicBool::new(false));
    app.state::<AppState>()
        .jobs
        .lock()
        .unwrap()
        .insert(id.clone(), cancel.clone());
    let runner = JobRunner {
        app,
        id: id.clone(),
        kind: kind.into(),
        label,
        cancel,
    };
    std::thread::spawn(move || runner.run(task));
    id
}

impl JobRunner {
    fn slot_queue<'a>(
        &self,
        state: &'a AppState,
    ) -> &'a (std::sync::Mutex<usize>, std::sync::Condvar) {
        if self.kind == "import" {
            &state.import_slots
        } else {
            &state.slots
        }
    }
    fn event(&self, progress: f64, status: &str) -> JobEvent {
        JobEvent {
            id: self.id.clone(),
            kind: self.kind.clone(),
            label: self.label.clone(),
            progress,
            status: status.into(),
            message: None,
            path: None,
        }
    }

    fn acquire_slot(&self) -> bool {
        let state = self.app.state::<AppState>();
        let queue = self.slot_queue(&state);
        let mut slots = queue.0.lock().unwrap();
        let limit = if self.kind == "import" { 1 } else { 2 };
        while *slots >= limit && !self.cancel.load(Ordering::Relaxed) {
            slots = queue
                .1
                .wait_timeout(slots, std::time::Duration::from_millis(100))
                .unwrap()
                .0;
        }
        if self.cancel.load(Ordering::Relaxed) {
            return false;
        }
        *slots += 1;
        true
    }

    fn release_slot(&self) {
        let state = self.app.state::<AppState>();
        let queue = self.slot_queue(&state);
        let mut slots = queue.0.lock().unwrap();
        *slots -= 1;
        queue.1.notify_one();
    }

    fn finish(&self, result: JobResult, progress: f64) {
        self.app
            .state::<AppState>()
            .jobs
            .lock()
            .unwrap()
            .remove(&self.id);
        let mut event = self.event(progress, "complete");
        match result {
            Ok(path) => event.path = path,
            Err(error) if error == "Cancelled" => event.status = "cancelled".into(),
            Err(error) => {
                event.status = "failed".into();
                event.message = Some(error);
            }
        }
        let _ = self.app.emit("job", event);
    }

    fn run(self, task: impl FnOnce(&tauri::AppHandle, &Cancel, &dyn Fn(f64)) -> JobResult) {
        if !self.acquire_slot() {
            self.finish(Err("Cancelled".into()), 0.);
            return;
        }
        let progress = |value| {
            let _ = self.app.emit("job", self.event(value, "running"));
        };
        progress(0.);
        let result = task(&self.app, &self.cancel, &progress);
        self.release_slot();
        self.finish(result, 1.);
    }
}
