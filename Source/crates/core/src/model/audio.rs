use serde::{Deserialize, Serialize};

/// Local DSP settings. Neutral defaults preserve version-one projects.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct AudioSettings {
    pub enabled: std::collections::BTreeMap<String, bool>,
    pub hum_reduction: f64,
    pub hiss_noise_volume: f64,
    pub channels: String,
    pub balance: f64,
    pub pitch: f64,
    pub equalizer: [f64; 10],
    pub normalize: bool,
    pub normalize_target: f64,
    pub duck_fade_duration: f64,
    pub duck_fade_position: f64,
    pub duck_fade_split: f64,
    pub ducking: bool,
    pub duck_amount: f64,
    pub denoise: f64,
    pub reverb_reduction: f64,
    pub wind_removal: bool,
    pub hiss: f64,
    pub dehum: u32,
    pub deess: f64,
    pub voice_filter: String,
    pub voice_character: String,
}
impl Default for AudioSettings {
    fn default() -> Self {
        Self {
            enabled: Default::default(),
            hum_reduction: -60.,
            hiss_noise_volume: 5.,
            channels: "stereo".into(),
            balance: 0.,
            pitch: 0.,
            equalizer: [0.; 10],
            normalize: false,
            normalize_target: -16.,
            duck_fade_duration: 0.33,
            duck_fade_position: 0.,
            duck_fade_split: 0.24242424242424243,
            ducking: false,
            duck_amount: 12.,
            denoise: 0.,
            reverb_reduction: 0.,
            wind_removal: false,
            hiss: 0.,
            dehum: 0,
            deess: 0.,
            voice_filter: "none".into(),
            voice_character: "none".into(),
        }
    }
}
impl AudioSettings {
    pub fn valid(&self) -> bool {
        (-60. ..=0.).contains(&self.hum_reduction)
            && (0. ..=10.).contains(&self.hiss_noise_volume)
            && ["stereo", "mono", "left", "right", "swap"].contains(&self.channels.as_str())
            && (-1. ..=1.).contains(&self.balance)
            && (-12. ..=12.).contains(&self.pitch)
            && self.equalizer.iter().all(|v| (-20. ..=20.).contains(v))
            && (0. ..=36.).contains(&self.duck_amount)
            && (-36. ..=-5.).contains(&self.normalize_target)
            && (0. ..=10.).contains(&self.duck_fade_duration)
            && (-10. ..=10.).contains(&self.duck_fade_position)
            && (0. ..=1.).contains(&self.duck_fade_split)
            && (0. ..=1.).contains(&self.reverb_reduction)
            && (0. ..=1.).contains(&self.denoise)
            && (0. ..=1.).contains(&self.hiss)
            && [0, 50, 60].contains(&self.dehum)
            && (0. ..=1.).contains(&self.deess)
            && [
                "none",
                "roadside",
                "forest",
                "glacier",
                "surround-music",
                "haas",
                "rain",
                "desert",
                "wind",
                "electrical",
                "diving-suit",
                "telephone",
                "radio",
                "echo",
                "large-room",
                "small-room",
                "lobby",
                "corridor",
                "cave",
                "church",
                "megaphone",
                "phonograph",
                "vinyl",
                "surround",
                "rotating",
                "trembling",
                "walkie-talkie",
            ]
            .contains(&self.voice_filter.as_str())
            && [
                "none",
                "male-mix",
                "hacker",
                "rotating-voice",
                "trembling-voice",
                "chipmunk",
                "deep",
                "robot",
                "monster",
                "child",
                "man",
                "woman",
                "husky",
                "robot-2",
                "transformer",
                "water",
                "helium",
                "evil",
            ]
            .contains(&self.voice_character.as_str())
    }
    pub fn needs_processing(&self) -> bool {
        let effective = self.effective();
        let neutral = Self {
            enabled: effective.enabled.clone(),
            hum_reduction: self.hum_reduction,
            hiss_noise_volume: self.hiss_noise_volume,
            ducking: self.ducking,
            duck_amount: self.duck_amount,
            duck_fade_duration: self.duck_fade_duration,
            duck_fade_position: self.duck_fade_position,
            duck_fade_split: self.duck_fade_split,
            normalize_target: self.normalize_target,
            ..Self::default()
        };
        effective != neutral
    }
}

impl AudioSettings {
    pub fn effective(&self) -> Self {
        let mut a = self.clone();
        if self.enabled.get("denoise") == Some(&false) {
            a.denoise = 0.;
        }
        if self.enabled.get("hiss") == Some(&false) {
            a.hiss = 0.;
        }
        if self.enabled.get("reverbReduction") == Some(&false) {
            a.reverb_reduction = 0.;
        }
        if self.enabled.get("dehum") == Some(&false) {
            a.dehum = 0;
        }
        if self.enabled.get("deess") == Some(&false) {
            a.deess = 0.;
        }
        a
    }
}
