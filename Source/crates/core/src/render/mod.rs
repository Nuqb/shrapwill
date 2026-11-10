//! Shared render planning, title rasterization, color, and original-media export.
use crate::{
    media::{self, Cancel, ExportSettings},
    model::id,
    Clip, Project,
};
use serde::Serialize;
use std::{fs, path::Path, sync::atomic::Ordering};

mod analysis;
mod color;
pub use analysis::{analyze_frame, AnalysisFrame};
mod creative_effects;
mod demo;
mod demo_photos;
mod encoding;
mod export;
mod gpu_process;
mod motion_geometry;
mod motion_transitions;
mod original_resources;
mod plan;
mod ported;
mod ported_export;
mod source_effects;
mod spatial;
mod title_svg;
mod titles;
mod transitions;
mod video;
pub use color::{color_lut, transition_opacity, write_lut};
pub use demo::{preset_demo, DemoOptions};
pub use export::export;
pub use plan::{plan, RenderClip, RenderPlan};
pub use titles::prepare_titles;
#[cfg(test)]
mod budget_tests;
#[cfg(test)]
mod demo_tests;
#[cfg(test)]
mod tests;
