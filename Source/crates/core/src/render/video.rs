use super::{plan::RenderClip, spatial, transitions};
use crate::{media, Project};
use std::path::Path;

pub(super) struct VideoInput<'a> {
    pub index: usize,
    pub source_index: Option<usize>,
    pub clip: &'a RenderClip,
    pub project: &'a Project,
    pub size: (u32, u32),
    pub start: i64,
    pub lut: Option<&'a Path>,
}
fn filter_path(path: &Path) -> String {
    media::clean_path(path)
        .to_string_lossy()
        .replace('\\', "/")
        .replace(':', "\\:")
        .replace('\'', "'\\''")
}

fn geometry(input: &VideoInput<'_>) -> (u32, u32, String) {
    let rc = input.clip;
    let cp = &rc.clip.props;
    let (w, h) = input.size;
    let cw = (rc.width as f64 * (1. - cp.crop_left - cp.crop_right)).max(1.);
    let ch = (rc.height as f64 * (1. - cp.crop_top - cp.crop_bottom)).max(1.);
    let fit =
        (w as f64 / cw).min(h as f64 / ch) * if cp.animation.is_some() { 1. } else { cp.scale };
    let rw = (cw * fit).round().max(2.) as u32;
    let rh = (ch
        * fit
        * if cp.animation.is_some() {
            1.
        } else {
            cp.video.height_scale
        })
    .round()
    .max(2.) as u32;
    let crop = if [cp.crop_left, cp.crop_right, cp.crop_top, cp.crop_bottom]
        .iter()
        .all(|v| *v == 0.)
    {
        String::new()
    } else {
        format!(
            ",crop=iw*{}:ih*{}:iw*{}:ih*{}",
            1. - cp.crop_left - cp.crop_right,
            1. - cp.crop_top - cp.crop_bottom,
            cp.crop_left,
            cp.crop_top
        )
    };
    (rw, rh, crop)
}
fn append_adjustments(chain: &mut String, input: &VideoInput<'_>) {
    let c = &input.clip.clip;
    if c.props.grade.sharpen > 0. {
        let s = c.props.grade.sharpen;
        let matrix = format!("0 {} 0 {} {} {} 0 {} 0", -s, -s, 1. + 4. * s, -s, -s);
        chain.push_str(&format!(
            ",convolution=0m='{matrix}':1m='{matrix}':2m='{matrix}':0rdiv=1:1rdiv=1:2rdiv=1"
        ));
    }
    if let Some(lut) = input.lut {
        chain.push_str(&format!(
            ",format=rgba,lut3d=file='{}':interp=trilinear",
            filter_path(lut)
        ));
    }
    if c.props.opacity != 1. {
        chain.push_str(&format!(
            ",format=rgba,colorchannelmixer=aa={}",
            c.props.opacity
        ));
    }
    let transition = transitions::transition_filter(
        c,
        input.project.fps.seconds(input.start - c.start),
        &input.project.fps,
    );
    if !transition.is_empty() {
        chain.push_str(",format=rgba");
        chain.push_str(&transition);
    }
    if c.props.rotation != 0. && c.props.animation.is_none() {
        let rotation = c.props.rotation * std::f64::consts::PI / 180.;
        chain.push_str(&format!(
            ",format=rgba,rotate={rotation}:ow=rotw({rotation}):oh=roth({rotation}):c=none"
        ));
    }
}
pub(super) fn chain(input: VideoInput<'_>) -> String {
    let i = input.index;
    let c = &input.clip.clip;
    let fps = format!("{}/{}", input.project.fps.num, input.project.fps.den);
    let (rw, rh, crop) = geometry(&input);
    let effect = spatial::filter(c, input.start - c.start);
    let source = input.source_index.unwrap_or(i);
    let mut chain = format!("[{source}:v]setpts=PTS-STARTPTS,fps={fps}");
    if !effect.is_empty() && c.props.effect_strength < 1. {
        let strength = c.props.effect_strength;
        chain.push_str(&format!(",format=rgba,split=2[effect-base-{i}][effect-work-{i}];[effect-work-{i}]null{effect}[effect-result-{i}];[effect-base-{i}][effect-result-{i}]blend=all_expr='A*(1-{strength})+B*{strength}':shortest=1,format=rgba"));
    } else {
        chain.push_str(&effect);
    }
    chain.push_str(&crop);
    if !crop.is_empty() || rw != input.clip.width || rh != input.clip.height {
        chain.push_str(&format!(",scale={rw}:{rh}:flags=bilinear"));
    }
    if c.props.video.flip_horizontal {
        chain.push_str(",hflip");
    }
    if c.props.video.flip_vertical {
        chain.push_str(",vflip");
    }
    if c.props.animation.is_some() {
        let (w, h) = input.size;
        chain.push_str(&format!(
            ",format=rgba,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color=black@0"
        ));
        chain.push_str(&super::animation::filter(
            c,
            input.start - c.start,
            input.size,
            input.project,
        ));
    }
    append_adjustments(&mut chain, &input);
    chain.push_str(&format!("[v{i}]"));
    chain
}
