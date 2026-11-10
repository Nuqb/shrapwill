use cutline_core::{media::Cancel, Editor, Project};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{atomic::AtomicBool, Condvar, Mutex},
};

pub(crate) struct Session {
    pub(crate) editor: Editor,
    pub(crate) path: Option<String>,
}
pub(crate) struct AppState {
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
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Snapshot {
    pub(crate) project: Project,
    pub(crate) path: Option<String>,
    pub(crate) dirty: bool,
    pub(crate) revision: u64,
    pub(crate) can_undo: bool,
    pub(crate) can_redo: bool,
    pub(crate) can_paste: bool,
    pub(crate) render: Option<serde_json::Value>,
}
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
