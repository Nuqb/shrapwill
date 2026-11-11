use crate::ColorGrade;
fn curve(value: f64, points: &[f64; 5]) -> f64 {
    let x = value.clamp(0., 1.) * 4.;
    let index = (x.floor() as usize).min(3);
    points[index] + (points[index + 1] - points[index]) * (x - index as f64)
}
pub(super) fn apply(rgb: [f64; 3], g: &ColorGrade) -> [f64; 3] {
    if *g == ColorGrade::default() {
        return rgb;
    }
    let l = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    let shadow = (1. - l).powi(2);
    let highlight = l.powi(2);
    let max = rgb.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let min = rgb.iter().copied().fold(f64::INFINITY, f64::min);
    let delta = max - min;
    let hue = if delta < 1e-9 {
        0.
    } else if max == rgb[0] {
        ((rgb[1] - rgb[2]) / delta).rem_euclid(6.) / 6.
    } else if max == rgb[1] {
        ((rgb[2] - rgb[0]) / delta + 2.) / 6.
    } else {
        ((rgb[0] - rgb[1]) / delta + 4.) / 6.
    };
    let centers = [
        0.,
        30. / 360.,
        60. / 360.,
        120. / 360.,
        180. / 360.,
        240. / 360.,
        270. / 360.,
        300. / 360.,
    ];
    let mut adjustments = [0.; 3];
    for (i, center) in centers.iter().enumerate() {
        let distance = (hue - center).abs().min(1. - (hue - center).abs());
        let weight = (1. - distance * 6.).max(0.);
        for (j, a) in adjustments.iter_mut().enumerate() {
            *a += g.hsl[i][j] * weight;
        }
    }
    let saturation_input = if max > 1e-9 { delta / max } else { 0. };
    let secondary = &g.secondary_curves;
    adjustments[0] += (curve(hue, &secondary[1]) - 0.5) * 2.;
    adjustments[1] += (curve(hue, &secondary[0])
        + curve(l, &secondary[3])
        + curve(saturation_input, &secondary[4])
        - 1.5)
        * 2.;
    adjustments[2] +=
        (curve(hue, &secondary[2]) + curve(saturation_input, &secondary[5]) - 1.) * 2.;
    let angle = adjustments[0] * std::f64::consts::PI;
    let u = angle.cos();
    let w = angle.sin();
    let rotated = if adjustments[0] == 0. {
        rgb
    } else {
        [
            (0.299 + 0.701 * u + 0.168 * w) * rgb[0]
                + (0.587 - 0.587 * u + 0.330 * w) * rgb[1]
                + (0.114 - 0.114 * u - 0.497 * w) * rgb[2],
            (0.299 - 0.299 * u - 0.328 * w) * rgb[0]
                + (0.587 + 0.413 * u + 0.035 * w) * rgb[1]
                + (0.114 - 0.114 * u + 0.292 * w) * rgb[2],
            (0.299 - 0.300 * u + 1.250 * w) * rgb[0]
                + (0.587 - 0.588 * u - 1.050 * w) * rgb[1]
                + (0.114 + 0.886 * u - 0.203 * w) * rgb[2],
        ]
    };
    std::array::from_fn(|i| {
        let saturation = 1. + adjustments[1] + g.vibrance * (1. - delta);
        let mut x =
            (l + (rotated[i] - l) * saturation + adjustments[2] * 0.25) * 2f64.powf(g.exposure);
        x += g.shadows * shadow * 0.25
            + g.highlights * highlight * 0.25
            + g.blacks * shadow.powi(2) * 0.25
            + g.whites * highlight.powi(2) * 0.25;
        x += g.wheels[0][i] * shadow * 0.25
            + g.wheels[1][i] * (1. - shadow - highlight) * 0.25
            + g.wheels[2][i] * highlight * 0.25;
        let centers = [0., 0.1, 0.25, 0.5, 0.75, 0.9];
        let widths = [0.15, 0.2, 0.3, 0.3, 0.3, 0.2];
        for (j, wheel) in g.hdr_wheels.iter().enumerate() {
            let weight = if j == 6 {
                1.
            } else {
                (1. - (l - centers[j]).abs() / widths[j]).max(0.)
            };
            x += wheel[i] * weight * 0.25;
        }
        curve(curve(x, &g.curves[0]), &g.curves[i + 1]).clamp(0., 1.)
    })
}
