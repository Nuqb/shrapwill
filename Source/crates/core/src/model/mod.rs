//! Versioned project model, undoable editing, and local project storage.
mod animation;
pub(crate) use animation::animation_preset;
pub use animation::AnimationSettings;
mod audio;
pub use audio::AudioSettings;
mod clipboard;
mod edit;
mod editor;
mod grading;
mod magnetic;
mod mutations;
mod picture_settings;
mod selection;
mod storage;
mod timeline_rules;
mod title_styles;
mod types;
mod validation;
pub use grading::ColorGrade;

pub use edit::Edit;
pub use editor::Editor;
use magnetic::{close_main_gaps, insert_main_clips, main_timing};
use selection::{ensure_unlocked, find_mut, linked_ids};
use std::{fs, path::Path};
pub use storage::{atomic_write, replace_file};
pub use types::*;

#[cfg(test)]
mod tests;
