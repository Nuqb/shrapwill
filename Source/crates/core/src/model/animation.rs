use serde::{Deserialize, Serialize};
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct AnimationSettings {
    pub keyframe: String,
    pub in_preset: String,
    pub out_preset: String,
    pub frames: i64,
}
impl Default for AnimationSettings {
    fn default() -> Self {
        Self {
            keyframe: String::new(),
            in_preset: String::new(),
            out_preset: String::new(),
            frames: 30,
        }
    }
}
impl AnimationSettings {
    pub fn valid(&self) -> bool {
        self.frames > 0
            && self.frames <= 36000
            && [&self.keyframe, &self.in_preset, &self.out_preset]
                .iter()
                .all(|id| id.is_empty() || animation_preset(id).is_some())
    }
}

#[derive(Deserialize)]
pub(crate) struct AnimationPreset {
    pub id: String,
    pub curves: std::collections::BTreeMap<String, Vec<[f64; 2]>>,
}
pub(crate) fn animation_preset(id: &str) -> Option<&'static AnimationPreset> {
    static CATALOG: std::sync::OnceLock<Vec<AnimationPreset>> = std::sync::OnceLock::new();
    CATALOG
        .get_or_init(|| {
            serde_json::from_str(include_str!(
                "../../../../src/features/library/catalog/animation-presets.json"
            ))
            .expect("bundled animation catalog")
        })
        .iter()
        .find(|p| p.id == id)
}
