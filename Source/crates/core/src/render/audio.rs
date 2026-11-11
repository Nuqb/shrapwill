use super::*;
use std::collections::HashMap;

pub(super) fn prepare(
    ffmpeg: &Path,
    plan: &RenderPlan,
    cache: &Path,
    cancel: &Cancel,
) -> Result<HashMap<String, std::path::PathBuf>, String> {
    let mut sources = HashMap::new();
    for rc in &plan.clips {
        if !rc.audible || !rc.clip.props.audio.needs_processing() {
            continue;
        }
        let path = media::audio::prepare(media::audio::AudioRequest {
            ffmpeg,
            source: Path::new(&rc.source),
            source_in: rc.clip.source_in,
            duration: plan.fps.seconds(rc.clip.duration),
            settings: &rc.clip.props.audio,
            cache,
            cancel,
        })?;
        sources.insert(rc.clip.id.clone(), path);
    }
    Ok(sources)
}

pub(super) fn inputs(
    args: &mut Vec<String>,
    sources: &HashMap<String, std::path::PathBuf>,
    active: &[&RenderClip],
    timing: (&Project, i64, usize),
) -> HashMap<String, usize> {
    let (p, start, mut index) = timing;
    let mut indices = HashMap::new();
    for rc in active {
        if let Some(path) = sources.get(&rc.clip.id) {
            args.extend(media::strings(&[
                "-threads",
                "2",
                "-ss",
                &p.fps.seconds(start - rc.clip.start).to_string(),
                "-i",
                &path.to_string_lossy(),
            ]));
            indices.insert(rc.clip.id.clone(), index);
            index += 1;
        }
    }
    indices
}

/// Foreground ducking with a shared adjustable attack/release envelope.
pub(super) fn duck_envelope(plan: &RenderPlan, target: &Clip, start: i64) -> String {
    if target.props.audio.ducking {
        return "1".into();
    }
    let mut expression = "1".to_string();
    for rc in &plan.clips {
        let c = &rc.clip;
        let shifted_start = c.start as f64 + c.props.audio.duck_fade_position * plan.fps.fps();
        let shifted_end = shifted_start + c.duration as f64;
        if !rc.audible
            || !c.props.audio.ducking
            || c.id == target.id
            || (c.link.is_some() && c.link == target.link)
            || shifted_start >= (target.start + target.duration) as f64
            || shifted_end <= target.start as f64
        {
            continue;
        }
        let from = plan.fps.seconds(c.start - start) + c.props.audio.duck_fade_position;
        let to = plan.fps.seconds(c.start + c.duration - start) + c.props.audio.duck_fade_position;
        let amount = 1. - 10_f64.powf(-c.props.audio.duck_amount / 20.);
        let attack = (c.props.audio.duck_fade_duration * c.props.audio.duck_fade_split).max(0.001);
        let release =
            (c.props.audio.duck_fade_duration * (1. - c.props.audio.duck_fade_split)).max(0.001);
        let envelope =
            format!("1-{amount}*max(0,min(1,min((t-({from}))/{attack},(({to})-t)/{release})))");
        expression = format!("min({expression},{envelope})");
    }
    expression
}
