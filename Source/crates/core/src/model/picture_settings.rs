use super::ColorGrade;

impl super::Properties {
    pub fn effective_picture(&self) -> Self {
        let mut p = self.clone();
        if !self.video.transform_enabled {
            p.x = 0.;
            p.y = 0.;
            p.scale = 1.;
            p.rotation = 0.;
            p.video.flip_horizontal = false;
            p.video.flip_vertical = false;
            p.video.height_scale = 1.;
        }
        if !self.video.compositing_enabled {
            p.opacity = 1.;
        }
        if !self.grade.enabled("LUT") {
            p.original_filter.clear();
        }
        if !self.grade.enabled("Color") {
            p.warmth = 0.;
            p.tint = 0.;
            p.saturation = 1.;
            p.grade.vibrance = 0.;
        }
        if !self.grade.enabled("Light") {
            p.brightness = 0.;
            p.contrast = 1.;
            p.grade.exposure = 0.;
            p.grade.highlights = 0.;
            p.grade.shadows = 0.;
            p.grade.whites = 0.;
            p.grade.blacks = 0.;
        }
        if !self.grade.enabled("Adjust") {
            p.grade.sharpen = 0.;
            p.sepia = 0.;
            p.invert = 0.;
            p.posterize = 0.;
        }
        if !self.grade.enabled("Vignette") {
            p.vignette = 0.;
            p.grade.vignette_settings = ColorGrade::default().vignette_settings;
        }
        if !self.grade.enabled("HSL") {
            p.grade.hsl = [[0.; 3]; 8];
        }
        if !self.grade.enabled("Curves") {
            p.grade.curves = ColorGrade::default().curves;
        }
        if !self.grade.enabled("Hue/Saturation Curves") {
            p.grade.secondary_curves = [[0.5; 5]; 6];
        }
        if !self.grade.enabled("Color Wheels") {
            p.grade.wheels = [[0.; 3]; 3];
        }
        if !self.grade.enabled("HDR Color Wheel") {
            p.grade.hdr_wheels = [[0.; 3]; 7];
        }
        p
    }
}
