//! Built-in catalog shared with the browser; never loaded from project-controlled paths.
use serde::Deserialize;
use std::sync::OnceLock;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TitleDesign {
    pub style: String,
    pub sample: String,
    pub base: String,
    pub font_size: f64,
    pub color: String,
    pub accent: String,
    pub position: f64,
    pub spacing: f64,
    pub weight: u32,
    pub family: String,
    #[serde(default)]
    pub paint: Option<TitlePaint>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TitlePaint {
    pub opacity: f64,
    pub stroke: String,
    pub stroke_width: f64,
    pub stroke_opacity: f64,
    pub shadow: String,
    pub shadow_opacity: f64,
    pub shadow_blur: f64,
}
#[derive(Deserialize)]
pub(crate) struct RevealDesign {
    pub kind: String,
    pub family: String,
    pub axis: u32,
    pub reverse: bool,
    pub count: u32,
}
pub(crate) fn titles() -> &'static [TitleDesign] {
    static ITEMS: OnceLock<Vec<TitleDesign>> = OnceLock::new();
    ITEMS.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../../src/features/library/catalog/titles.json"
        ))
        .expect("built-in titles")
    })
}
pub(crate) fn reveals() -> &'static [RevealDesign] {
    static ITEMS: OnceLock<Vec<RevealDesign>> = OnceLock::new();
    ITEMS.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../../src/features/library/catalog/transitions.json"
        ))
        .expect("built-in transitions")
    })
}
#[derive(Deserialize)]
pub(crate) struct MotionDesign {
    pub kind: String,
    pub dx: f64,
    pub dy: f64,
    pub zoom: f64,
    pub blur: f64,
    #[serde(default)]
    pub spin: f64,
    #[serde(default)]
    pub warp: f64,
    #[serde(default)]
    pub flash: f64,
    #[serde(default)]
    pub pixel: f64,
    #[serde(default)]
    pub glitch: f64,
    #[serde(default)]
    pub mask: u32,
    #[serde(default)]
    pub seed: f64,
    #[serde(default)]
    pub grayscale: f64,
    #[serde(default)]
    pub tint: f64,
}
pub(crate) fn motions() -> &'static [MotionDesign] {
    static ITEMS: OnceLock<Vec<MotionDesign>> = OnceLock::new();
    ITEMS.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../../src/features/library/catalog/motion-transitions.json"
        ))
        .expect("built-in motion transitions")
    })
}
pub(crate) fn valid_transition(kind: &str) -> bool {
    [
        "fade",
        "dissolve",
        "wipe_left",
        "wipe_right",
        "wipe_up",
        "wipe_down",
        "iris_open",
        "iris_close",
        "blinds",
        "checker",
    ]
    .contains(&kind)
        || reveals().iter().any(|item| item.kind == kind)
        || motions().iter().any(|item| item.kind == kind)
}

#[cfg(test)]
mod tests {
    use crate::{Project, Properties};

    #[test]
    fn every_bundled_filter_and_effect_passes_core_validation() {
        for json in [
            include_str!("../../../src/features/library/catalog/filters.json"),
            include_str!("../../../src/features/library/catalog/effects.json"),
        ] {
            let entries: Vec<Properties> = serde_json::from_str(json).unwrap();
            for props in entries {
                let project = Project::default();
                let track_id = project.tracks[0].id.clone();
                let mut editor = crate::Editor::new(project);
                editor
                    .apply(crate::Edit::AddTitle {
                        style: "plain".into(),
                        track_id,
                        start: 0,
                    })
                    .unwrap();
                let id = editor
                    .project
                    .tracks
                    .iter()
                    .flat_map(|track| &track.clips)
                    .next()
                    .unwrap()
                    .id
                    .clone();
                editor.apply(crate::Edit::Properties { id, props }).unwrap();
            }
        }
    }
}
