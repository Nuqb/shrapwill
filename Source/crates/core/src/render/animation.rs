//! Fixed-canvas inverse transforms keep animation memory bounded at output resolution.
use crate::{model::animation_preset, Clip};
fn curve(points: &[[f64; 2]], t: &str) -> String {
    if points.iter().all(|p| p[1] == points[0][1]) {
        return points[0][1].to_string();
    }
    let mut expression = String::new();
    for pair in points.windows(2).rev() {
        let [left, right] = [pair[0], pair[1]];
        let span = (right[0] - left[0]).max(1e-9);
        let value = format!(
            "{}+({})*clip((({t})-{})/{span},0,1)",
            left[1],
            right[1] - left[1],
            left[0]
        );
        expression = if expression.is_empty() {
            value
        } else {
            format!("if(lte(({t}),{}),{value},{expression})", right[0])
        };
    }
    expression
}
fn property(c: &Clip, key: &str, elapsed: &str) -> String {
    let a = c.props.animation.as_ref().unwrap();
    let duration = (a.frames as f64).min(c.duration as f64 / 2.).max(0.5);
    let specs = [
        (&a.keyframe, format!("({elapsed})/{}", c.duration)),
        (&a.in_preset, format!("({elapsed})/{duration}")),
        (
            &a.out_preset,
            format!("(({elapsed})-{}+{duration})/{duration}", c.duration),
        ),
    ];
    let scale = key.starts_with("Scale") || key == "Opacity";
    let mut values = Vec::new();
    for (id, t) in specs {
        if let Some(points) = animation_preset(id).and_then(|p| p.curves.get(key)) {
            let identity = if scale {
                100.
            } else if key.starts_with("Position") {
                0.5
            } else {
                0.
            };
            if points.iter().all(|p| p[1] == identity) {
                continue;
            }
            let v = curve(points, &t);
            values.push(if scale {
                format!("({v})/100")
            } else if key.starts_with("Position") {
                format!("({v})-0.5")
            } else {
                v
            });
        }
    }
    if values.is_empty() {
        if scale {
            "1".into()
        } else {
            "0".into()
        }
    } else {
        format!("({})", values.join(if scale { ")*(" } else { ")+(" }))
    }
}
pub(super) fn filter(c: &Clip, offset: i64, size: (u32, u32), project: &crate::Project) -> String {
    if c.props.animation.is_none() {
        return String::new();
    }
    let t = format!("N+{offset}");
    let sx = property(c, "Scale_x", &t);
    let sy = property(c, "Scale_y", &t);
    let rotation = property(c, "Rotation", &t);
    let x = property(c, "Position_x", &t);
    let y = property(c, "Position_y", &t);
    let alpha = property(c, "Opacity", &t);
    let p = &c.props;
    let output_scale = size.1 as f64 / project.height as f64;
    // Coordinates use pixel centers, matching WebGL geometry. Registers are local to each expression.
    let (angle, cos, sin) = if rotation == "0" {
        let radians = p.rotation.to_radians();
        (
            String::new(),
            radians.cos().to_string(),
            radians.sin().to_string(),
        )
    } else {
        (
            format!("st(0,({rotation}+{})*PI/180);", p.rotation),
            "cos(ld(0))".into(),
            "sin(ld(0))".into(),
        )
    };
    let scale_x = if sx == "1" {
        p.scale.max(0.0001).to_string()
    } else {
        format!("max(0.0001,({sx})*{})", p.scale)
    };
    let scale_y = if sy == "1" {
        (p.scale * p.video.height_scale).max(0.0001).to_string()
    } else {
        format!("max(0.0001,({sy})*{})", p.scale * p.video.height_scale)
    };
    let setup = format!("{angle}st(1,X+0.5-W/2-({x})*W-{});st(2,Y+0.5-H/2-({y})*H-{});st(3,(ld(1)*{cos}+ld(2)*{sin})/({scale_x})+W/2-0.5);st(4,(-ld(1)*{sin}+ld(2)*{cos})/({scale_y})+H/2-0.5);",p.x*output_scale,p.y*output_scale);
    let sample = |channel: &str| format!("{setup}{channel}(clip(ld(3),0,W-1),clip(ld(4),0,H-1))");
    let opacity = format!("{setup}if(between(ld(3),0,W-1)*between(ld(4),0,H-1),alpha(clip(ld(3),0,W-1),clip(ld(4),0,H-1))*({alpha}),0)");
    format!(
        ",format=gbrap,geq=r='{}':g='{}':b='{}':a='{opacity}':interpolation=bilinear,format=rgba",
        sample("r"),
        sample("g"),
        sample("b")
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        media,
        render::{plan::RenderClip, video},
        AnimationSettings, Project, Properties,
    };
    #[test]
    fn every_animation_renders_at_bounded_dimensions_and_fades_have_alpha() {
        let ffmpeg =
            std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../App/ffmpeg.exe");
        let cancel = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        let catalog: Vec<serde_json::Value> = serde_json::from_str(include_str!(
            "../../../../src/features/library/catalog/animation-presets.json"
        ))
        .unwrap();
        let project = Project {
            width: 64,
            height: 64,
            ..Default::default()
        };
        let mut faded = Vec::new();
        for preset in catalog {
            let id = preset["id"].as_str().unwrap();
            let mut animation = AnimationSettings::default();
            match preset["scene"].as_str().unwrap() {
                "keyframe" => animation.keyframe = id.into(),
                "animation_scene_in" => animation.in_preset = id.into(),
                _ => animation.out_preset = id.into(),
            }
            let clip = Clip {
                id: "animation-test".into(),
                media_id: None,
                name: "Animation".into(),
                start: 0,
                duration: 60,
                source_in: 0.,
                link: None,
                audio_enabled: false,
                props: Properties {
                    animation: Some(Box::new(animation)),
                    ..Default::default()
                },
                title: None,
                transition: None,
            };
            let rc = RenderClip {
                clip,
                track_id: "video".into(),
                kind: "video".into(),
                source: String::new(),
                width: 64,
                height: 64,
                audible: false,
                preview_ready: true,
            };
            for offset in [0, 30, 59] {
                let chain = video::chain(video::VideoInput {
                    index: 0,
                    source_index: None,
                    clip: &rc,
                    project: &project,
                    size: (64, 64),
                    start: offset,
                    lut: None,
                });
                let args = media::strings(&[
                    "-v",
                    "error",
                    "-f",
                    "lavfi",
                    "-i",
                    "color=c=white:s=64x64:d=0.1",
                    "-filter_complex",
                    &chain,
                    "-map",
                    "[v0]",
                    "-frames:v",
                    "1",
                    "-f",
                    "rawvideo",
                    "-pix_fmt",
                    "rgba",
                    "pipe:1",
                ]);
                let pixels = media::capture(&ffmpeg, &args, &cancel, 64 * 64 * 4)
                    .unwrap_or_else(|e| panic!("{} at {offset}: {e}", preset["name"]));
                assert_eq!(pixels.len(), 64 * 64 * 4);
                if preset["name"] == "Fade in" && preset["scene"] == "keyframe" {
                    faded.push(pixels[(32 * 64 + 32) * 4 + 3]);
                }
            }
        }
        assert_eq!(faded[0], 0);
        assert!(faded[1] > 110 && faded[1] < 145);
        assert!(faded[2] > 245);
    }
}
