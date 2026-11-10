use cutline_core::{media::Cancel, Editor};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{atomic::AtomicBool, Condvar, Mutex},
};

#[derive(Default)]
pub(crate) struct Session {
    pub(crate) editor: Editor,
    pub(crate) path: Option<String>,
    pub(crate) updates: cutline_core::sync::PublishedState,
}
pub(crate) struct AppState {
    pub(crate) updates: std::sync::Arc<crate::updates::UpdateState>,
    pub(crate) session: Mutex<Session>,
    pub(crate) jobs: Mutex<HashMap<String, Cancel>>,
    pub(crate) slots: (Mutex<usize>, Condvar),
    pub(crate) import_slots: (Mutex<usize>, Condvar),
    pub(crate) cache: PathBuf,
    pub(crate) data: PathBuf,
    pub(crate) ffmpeg: PathBuf,
    pub(crate) ffprobe: PathBuf,
    pub(crate) encoders: Mutex<Vec<String>>,
    pub(crate) closing: AtomicBool,
}
pub(crate) use cutline_core::sync::Snapshot;
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct JobEvent {
    pub(crate) id: String,
    pub(crate) kind: String,
    pub(crate) label: String,
    pub(crate) progress: f64,
    pub(crate) status: String,
    pub(crate) message: Option<String>,
    pub(crate) path: Option<String>,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Recent {
    pub(crate) name: String,
    pub(crate) path: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Startup {
    pub(crate) snapshot: Snapshot,
    pub(crate) recents: Vec<Recent>,
    pub(crate) recovery: bool,
    pub(crate) encoders: Vec<String>,
    pub(crate) version: String,
}
