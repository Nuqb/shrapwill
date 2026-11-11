use super::*;
pub fn transition_opacity(c: &Clip, frame: f64) -> f64 {
    let mut alpha = c.props.opacity;
    if let Some(t) = &c.transition {
        if super::ported::shader(&t.kind).is_some() {
            return alpha;
        }
        if !["fade", "dissolve"].contains(&t.kind.as_str()) {
            return alpha;
        }
        let f = frame - c.start as f64;
        alpha *= (f / t.frames as f64).clamp(0., 1.);
        if t.kind == "fade" {
            alpha *= ((c.duration as f64 - f) / t.frames as f64).clamp(0., 1.)
        }
    }
    alpha
}

pub(super) fn is_neutral(p: &crate::Properties) -> bool {
    p.filter_strength == 0.
        || (p.brightness == 0.
            && *p.grade == crate::ColorGrade::default()
            && p.contrast == 1.
            && p.saturation == 1.
            && p.warmth == 0.
            && p.tint == 0.
            && p.sepia == 0.
            && p.invert == 0.
            && p.posterize == 0.)
}

pub fn grade_color(rgb: [f64; 3], p: &crate::Properties) -> [f64; 3] {
    let l = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    let mut base =
        rgb.map(|x| (l + (x - l) * p.saturation - 0.5) * p.contrast + 0.5 + p.brightness);
    base[0] += p.warmth * 0.12;
    base[1] += p.tint * 0.12;
    base[2] -= p.warmth * 0.12;
    let sepia = [
        base[0] * 0.393 + base[1] * 0.769 + base[2] * 0.189,
        base[0] * 0.349 + base[1] * 0.686 + base[2] * 0.168,
        base[0] * 0.272 + base[1] * 0.534 + base[2] * 0.131,
    ];
    let adjusted = super::grading::apply(base, &p.grade);
    std::array::from_fn(|i| {
        let mut value = (adjusted[i] + (sepia[i] - adjusted[i]) * p.sepia).clamp(0., 1.);
        value += (1. - 2. * value) * p.invert;
        if p.posterize >= 2. {
            value = (value * (p.posterize - 1.)).round() / (p.posterize - 1.);
        }
        rgb[i] + (value.clamp(0., 1.) - rgb[i]) * p.filter_strength
    })
}

// A small, deterministic LUT is shared by the WebGL preview and FFmpeg's lut3d.
pub fn color_lut(clip: &Clip) -> Vec<f32> {
    let effective = clip.props.effective_picture();
    let p = &effective;
    let mut lut = Vec::with_capacity(17 * 17 * 17 * 3);
    for b in 0..17 {
        for g in 0..17 {
            for r in 0..17 {
                let rgb = [r as f64 / 16., g as f64 / 16., b as f64 / 16.];
                lut.extend(grade_color(rgb, p).map(|x| x as f32));
            }
        }
    }
    lut
}
pub fn write_lut(c: &Clip, path: &Path) -> Result<(), String> {
    let values = color_lut(c);
    let mut s = "LUT_3D_SIZE 17\nDOMAIN_MIN 0 0 0\nDOMAIN_MAX 1 1 1\n".to_string();
    for chunk in values.chunks(3) {
        s.push_str(&format!(
            "{:.7} {:.7} {:.7}\n",
            chunk[0], chunk[1], chunk[2]
        ));
    }
    fs::write(path, s).map_err(|e| e.to_string())
}
