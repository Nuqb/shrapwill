//! Versioned project model, undoable editing, and local project storage.
mod clipboard;
mod edit;
mod editor;
mod magnetic;
mod mutations;
mod selection;
mod storage;
mod title_styles;
mod types;
mod validation;

pub use edit::Edit;
pub use editor::Editor;
use magnetic::{close_main_gaps, insert_main_clips, main_timing};
use selection::{ensure_unlocked, find_mut, linked_ids};
use std::{fs, path::Path};
pub use storage::{atomic_write, replace_file};
pub use types::*;

#[cfg(test)]
mod tests;
