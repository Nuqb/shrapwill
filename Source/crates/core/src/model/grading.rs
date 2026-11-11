use serde::{Deserialize, Serialize};
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct ColorGrade {
    pub hdr_wheels: [[f64; 3]; 7],
    pub lut_strength: f64,
    pub sharpen: f64,
    pub vignette_settings: [f64; 5],
    pub enabled: std::collections::BTreeMap<String, bool>,
    pub secondary_curves: [[f64; 5]; 6],
    pub exposure: f64,
    pub vibrance: f64,
    pub highlights: f64,
    pub shadows: f64,
    pub whites: f64,
    pub blacks: f64,
    pub hsl: [[f64; 3]; 8],
    pub curves: [[f64; 5]; 4],
    pub wheels: [[f64; 3]; 3],
}
impl Default for ColorGrade {
    fn default() -> Self {
        Self {
            hdr_wheels: [[0.; 3]; 7],
            lut_strength: 1.,
            sharpen: 0.,
            vignette_settings: [1., 0., 0.5, 0., 0.5],
            enabled: Default::default(),
            secondary_curves: [[0.5; 5]; 6],
            exposure: 0.,
            vibrance: 0.,
            highlights: 0.,
            shadows: 0.,
            whites: 0.,
            blacks: 0.,
            hsl: [[0.; 3]; 8],
            curves: [[0., 0.25, 0.5, 0.75, 1.]; 4],
            wheels: [[0.; 3]; 3],
        }
    }
}
impl ColorGrade {
    pub fn valid(&self) -> bool {
        self.lut_strength.is_finite()
            && (0. ..=1.).contains(&self.lut_strength)
            && self.sharpen.is_finite()
            && (0. ..=1.).contains(&self.sharpen)
            && self.vignette_settings.iter().enumerate().all(|(i, v)| {
                v.is_finite()
                    && if i == 3 {
                        (-1. ..=1.).contains(v)
                    } else {
                        (0. ..=1.).contains(v)
                    }
            })
            && self.exposure.is_finite()
            && (-4. ..=4.).contains(&self.exposure)
            && [
                self.vibrance,
                self.highlights,
                self.shadows,
                self.whites,
                self.blacks,
            ]
            .iter()
            .all(|v| v.is_finite() && (-1. ..=1.).contains(v))
            && self
                .hsl
                .iter()
                .flatten()
                .chain(self.wheels.iter().flatten())
                .chain(self.hdr_wheels.iter().flatten())
                .all(|v| v.is_finite() && (-1. ..=1.).contains(v))
            && self
                .curves
                .iter()
                .chain(self.secondary_curves.iter())
                .flatten()
                .all(|v| v.is_finite() && (0. ..=1.).contains(v))
    }
}

impl ColorGrade {
    pub fn enabled(&self, key: &str) -> bool {
        self.enabled.get(key).copied().unwrap_or(true)
    }
}
