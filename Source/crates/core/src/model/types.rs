use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub fn id() -> String {
    Uuid::new_v4().to_string()
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FrameRate {
    pub num: u32,
    pub den: u32,
}
impl Default for FrameRate {
    fn default() -> Self {
        Self { num: 30, den: 1 }
    }
}
impl FrameRate {
    pub fn fps(&self) -> f64 {
        self.num as f64 / self.den as f64
    }
    pub fn seconds(&self, frames: i64) -> f64 {
        frames as f64 * self.den as f64 / self.num as f64
    }
    pub fn frames(&self, seconds: f64) -> i64 {
        (seconds * self.fps()).round() as i64
    }
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaAsset {
    pub id: String,
    pub path: String,
    pub name: String,
    pub kind: String,
    pub duration: f64,
    pub width: u32,
    pub height: u32,
    pub has_audio: bool,
    pub preview_path: Option<String>,
    pub thumbnail_path: Option<String>,
    #[serde(default)]
    pub waveform: Vec<f32>,
    #[serde(default)]
    pub missing: bool,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Properties {
    pub x: f64,
    pub y: f64,
    pub scale: f64,
    pub rotation: f64,
    pub opacity: f64,
    pub crop_left: f64,
    pub crop_right: f64,
    pub crop_top: f64,
    pub crop_bottom: f64,
    pub brightness: f64,
    pub contrast: f64,
    pub saturation: f64,
    pub warmth: f64,
    pub tint: f64,
    pub sepia: f64,
    pub invert: f64,
    pub posterize: f64,
    pub mosaic: f64,
    pub rgb_split: f64,
    pub shake: f64,
    pub mirror: f64,
    pub wave: f64,
    pub vignette: f64,
    pub scanlines: f64,
    pub effect_style: u32,
    pub effect_amount: f64,
    pub original_effect: String,
    pub original_filter: String,
    pub filter_strength: f64,
    pub effect_strength: f64,
    pub gain_db: f64,
    pub fade_in: i64,
    pub fade_out: i64,
}
impl Default for Properties {
    fn default() -> Self {
        Self {
            x: 0.,
            y: 0.,
            scale: 1.,
            rotation: 0.,
            opacity: 1.,
            crop_left: 0.,
            crop_right: 0.,
            crop_top: 0.,
            crop_bottom: 0.,
            brightness: 0.,
            contrast: 1.,
            saturation: 1.,
            warmth: 0.,
            tint: 0.,
            sepia: 0.,
            invert: 0.,
            posterize: 0.,
            mosaic: 0.,
            rgb_split: 0.,
            shake: 0.,
            mirror: 0.,
            wave: 0.,
            vignette: 0.,
            scanlines: 0.,
            effect_style: 0,
            effect_amount: 0.,
            original_effect: String::new(),
            original_filter: String::new(),
            filter_strength: 1.,
            effect_strength: 1.,
            gain_db: 0.,
            fade_in: 0,
            fade_out: 0,
        }
    }
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Title {
    pub text: String,
    pub style: String,
    pub font_size: f64,
    pub color: String,
    pub image_path: Option<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Transition {
    pub kind: String,
    pub frames: i64,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Clip {
    pub id: String,
    pub media_id: Option<String>,
    pub name: String,
    pub start: i64,
    pub duration: i64,
    pub source_in: f64,
    pub link: Option<String>,
    pub audio_enabled: bool,
    pub props: Properties,
    pub title: Option<Title>,
    pub transition: Option<Transition>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Track {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub locked: bool,
    pub muted: bool,
    pub visible: bool,
    pub clips: Vec<Clip>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub version: u32,
    #[serde(default)]
    pub magnetic_timeline: bool,
    pub id: String,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub fps: FrameRate,
    pub assets: Vec<MediaAsset>,
    pub tracks: Vec<Track>,
}
impl Default for Project {
    fn default() -> Self {
        Self {
            version: 1,
            magnetic_timeline: false,
            id: id(),
            name: "Untitled project".into(),
            width: 1920,
            height: 1080,
            fps: FrameRate::default(),
            assets: vec![],
            tracks: vec![
                Track {
                    id: id(),
                    name: "Video 1".into(),
                    kind: "video".into(),
                    locked: false,
                    muted: false,
                    visible: true,
                    clips: vec![],
                },
                Track {
                    id: id(),
                    name: "Audio 1".into(),
                    kind: "audio".into(),
                    locked: false,
                    muted: false,
                    visible: true,
                    clips: vec![],
                },
            ],
        }
    }
}
impl Project {
    pub fn duration(&self) -> i64 {
        self.tracks
            .iter()
            .flat_map(|t| &t.clips)
            .map(|c| c.start + c.duration)
            .max()
            .unwrap_or(0)
    }
    pub fn clip(&self, clip_id: &str) -> Option<(&Track, &Clip)> {
        self.tracks
            .iter()
            .find_map(|t| t.clips.iter().find(|c| c.id == clip_id).map(|c| (t, c)))
    }
    pub fn validate(&self) -> Result<(), String> {
        super::validation::validate(self)
    }
}
