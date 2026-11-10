use serde::Deserialize;
use std::sync::OnceLock;

#[derive(Deserialize)]
pub(crate) struct OriginalShader {
    pub kind: String,
    pub status: String,
    pub body: String,
    #[serde(default)]
    pub preamble: String,
    #[serde(default)]
    pub utility: bool,
    #[serde(default)]
    pub legacy: bool,
    #[serde(default)]
    pub family: String,
    #[serde(default = "two_inputs", rename = "sceneInputs")]
    pub scene_inputs: usize,
    #[serde(default)]
    pub textures: Vec<TextureGroup>,
    #[serde(default)]
    pub passes: Vec<RenderStage>,
    #[serde(default)]
    pub analysis: String,
    #[serde(default, rename = "switchInput")]
    pub switch_input: bool,
    #[serde(default)]
    pub curves: serde_json::Value,
}
#[derive(Deserialize, serde::Serialize)]
pub(crate) struct RenderStage {
    pub body: String,
    pub inputs: Vec<i32>,
    pub scale: Option<f64>,
    pub size: Option<Vec<u32>>,
    #[serde(default)]
    pub format: String,
    #[serde(default, rename = "largeScale")]
    pub large_scale: Option<f64>,
}
fn two_inputs() -> usize {
    2
}
#[derive(Deserialize, serde::Serialize)]
pub(crate) struct TextureGroup {
    pub files: Vec<String>,
    #[serde(default)]
    pub format: String,
    #[serde(default)]
    pub width: u32,
    #[serde(default)]
    pub height: u32,
    #[serde(default)]
    pub fps: f64,
    #[serde(default, rename = "frameCount")]
    pub frame_count: u32,
    #[serde(default, rename = "browserFrames")]
    pub browser_frames: Vec<String>,
    #[serde(default)]
    pub timing: String,
}
pub(crate) fn source(kind: &str) -> Option<&'static OriginalShader> {
    static ITEMS: OnceLock<Vec<OriginalShader>> = OnceLock::new();
    ITEMS
        .get_or_init(|| {
            let mut entries: Vec<OriginalShader> = serde_json::from_str(include_str!(
                "../../../src/features/preview/ported/manifest.json"
            ))
            .expect("original shader manifest");
            entries.extend(
                serde_json::from_str::<Vec<OriginalShader>>(include_str!(
                    "../../../src/features/preview/ported/effects-manifest.json"
                ))
                .expect("original effects manifest"),
            );
            entries
        })
        .iter()
        .find(|entry| entry.kind == kind)
}
pub(crate) fn valid_property(kind: &str, family: &str) -> bool {
    kind.is_empty() || source(kind).is_some_and(|entry| entry.family == family)
}
pub(crate) fn available_property(kind: &str, family: &str) -> bool {
    kind.is_empty()
        || source(kind).is_some_and(|entry| {
            entry.family == family && entry.status == "shader" && !entry.legacy
        })
}
pub(crate) fn supported(kind: &str) -> bool {
    source(kind).is_some_and(|entry| entry.status == "shader" && !entry.utility)
}
pub(crate) fn unavailable(kind: &str) -> bool {
    (source(kind).is_some()
        || crate::creative::motions()
            .iter()
            .any(|entry| entry.kind == kind))
        && !supported(kind)
}
