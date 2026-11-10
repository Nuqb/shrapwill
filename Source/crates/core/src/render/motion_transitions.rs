use super::motion_geometry::{coverage, samples, setup};
use crate::creative::MotionDesign;

fn color(d: &MotionDesign, channel: &str) -> String {
    let base = samples(d, channel);
    let graded = if d.grayscale == 0. {
        base
    } else {
        let r = samples(d, "r");
        let g = samples(d, "g");
        let b = samples(d, "b");
        format!(
            "({base})*(1-{}*ld(1))+(({r})*0.2126+({g})*0.7152+({b})*0.0722)*{}*ld(1)",
            d.grayscale, d.grayscale
        )
    };
    let tint = match channel {
        "r" => d.tint,
        "b" => -d.tint,
        _ => 0.,
    };
    format!(
        "clip(({graded})+({tint})*255*ld(1)+{}*255*4*ld(0)*(1-ld(0)),0,255)",
        d.flash
    )
}
// Fixed five-sample budget; only bundled parameters can generate filter expressions.
pub(super) fn filter(d: &MotionDesign, local: f64, duration: f64) -> String {
    let progress = format!("min(1,max(0,({local}+T)/{duration}))");
    let setup = setup(d, &progress);
    let mut channels = Vec::new();
    for channel in ["r", "g", "b"] {
        channels.push(format!("{channel}='{setup}{}'", color(d, channel)));
    }
    channels.push(format!(
        "a='{setup}({})*({})'",
        samples(d, "alpha"),
        coverage(d)
    ));
    format!(",geq={}", channels.join(":"))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn every_motion_filter_renders_with_ffmpeg() {
        let ffmpeg = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe");
        for d in crate::creative::motions() {
            assert!(crate::creative::valid_transition(&d.kind));
            let graph = format!("format=rgba{}", filter(d, 0., 0.1));
            let result = std::process::Command::new(&ffmpeg)
                .args([
                    "-v",
                    "error",
                    "-f",
                    "lavfi",
                    "-i",
                    "testsrc2=s=32x24:r=30:d=0.2",
                    "-vf",
                    &graph,
                    "-f",
                    "null",
                    "-",
                ])
                .output()
                .unwrap();
            assert!(
                result.status.success(),
                "{}: {}",
                d.kind,
                String::from_utf8_lossy(&result.stderr)
            );
        }
    }
}
