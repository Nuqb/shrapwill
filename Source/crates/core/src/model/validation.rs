use super::*;
use std::collections::HashSet;

pub(super) fn validate(project: &Project) -> Result<(), String> {
    validate_settings(project)?;
    let mut ids = HashSet::new();
    for asset in &project.assets {
        if !ids.insert(asset.id.clone()) || !asset.duration.is_finite() || asset.duration < 0. {
            return Err("Invalid media metadata.".into());
        }
    }
    for track in &project.tracks {
        if !ids.insert(track.id.clone()) || !["video", "audio"].contains(&track.kind.as_str()) {
            return Err("Invalid track.".into());
        }
        for clip in &track.clips {
            validate_clip(project, clip, &mut ids)?;
        }
    }
    Ok(())
}

fn validate_settings(project: &Project) -> Result<(), String> {
    if project.version != 1 {
        return Err("This project was created by an unsupported version of Shrapwill.".into());
    }
    if project.width < 64
        || project.height < 64
        || project.width > 7680
        || project.height > 7680
        || !project.width.is_multiple_of(2)
        || !project.height.is_multiple_of(2)
        || project.fps.num == 0
        || project.fps.den == 0
        || !(1.0..=120.0).contains(&project.fps.fps())
    {
        return Err("Invalid project dimensions or frame rate.".into());
    }
    Ok(())
}

fn validate_clip(project: &Project, clip: &Clip, ids: &mut HashSet<String>) -> Result<(), String> {
    if !ids.insert(clip.id.clone())
        || clip.start < 0
        || clip.duration < 1
        || clip.start > i64::MAX - clip.duration
        || !clip.source_in.is_finite()
        || clip.source_in < 0.
    {
        return Err("A clip has invalid timing.".into());
    }
    validate_properties(&clip.props)?;
    if let Some(title) = &clip.title {
        validate_title(title)?;
    }
    if let Some(transition) = &clip.transition {
        validate_transition(transition, clip.duration)?;
    }
    validate_source(project, clip)
}

fn finite_properties(p: &Properties) -> bool {
    [
        p.x,
        p.y,
        p.scale,
        p.rotation,
        p.opacity,
        p.brightness,
        p.contrast,
        p.saturation,
        p.warmth,
        p.tint,
        p.sepia,
        p.invert,
        p.posterize,
        p.mosaic,
        p.rgb_split,
        p.shake,
        p.mirror,
        p.wave,
        p.vignette,
        p.scanlines,
        p.effect_amount,
        p.filter_strength,
        p.effect_strength,
        p.gain_db,
        p.crop_left,
        p.crop_right,
        p.crop_top,
        p.crop_bottom,
    ]
    .iter()
    .all(|value| value.is_finite())
}

fn validate_properties(p: &Properties) -> Result<(), String> {
    if !crate::transition_sources::valid_property(&p.original_filter, "filter")
        || !crate::transition_sources::valid_property(&p.original_effect, "effect")
    {
        return Err("Unknown original filter or effect.".into());
    }
    let color_and_audio = (0.01..=10.).contains(&p.scale)
        && (0.0..=1.).contains(&p.filter_strength)
        && (0.0..=1.).contains(&p.effect_strength)
        && (0.0..=1.).contains(&p.opacity)
        && (-1.0..=1.).contains(&p.brightness)
        && (0.0..=2.).contains(&p.contrast)
        && (0.0..=2.).contains(&p.saturation)
        && (-1.0..=1.).contains(&p.warmth)
        && (-1.0..=1.).contains(&p.tint)
        && (0.0..=1.).contains(&p.sepia)
        && (0.0..=1.).contains(&p.invert)
        && (p.posterize == 0. || (2.0..=16.).contains(&p.posterize))
        && (0.0..=0.25).contains(&p.mosaic)
        && (0.0..=0.1).contains(&p.rgb_split)
        && (0.0..=0.1).contains(&p.shake)
        && (p.mirror == 0. || p.mirror == 1.)
        && (0.0..=0.1).contains(&p.wave)
        && (0.0..=1.).contains(&p.vignette)
        && (0.0..=1.).contains(&p.scanlines)
        && p.effect_style <= 10
        && (0.0..=1.).contains(&p.effect_amount)
        && (-60.0..=24.).contains(&p.gain_db);
    let crop = [p.crop_left, p.crop_right, p.crop_top, p.crop_bottom]
        .iter()
        .all(|value| (0.0..=0.45).contains(value));
    if !finite_properties(p) || !color_and_audio || !crop || p.fade_in < 0 || p.fade_out < 0 {
        return Err("Invalid clip properties.".into());
    }
    Ok(())
}

fn validate_title(title: &Title) -> Result<(), String> {
    if title.text.chars().count() > 2000
        || !title.font_size.is_finite()
        || !(8.0..=250.0).contains(&title.font_size)
        || !(title.color.len() == 7
            && title.color.starts_with('#')
            && title.color[1..]
                .chars()
                .all(|value| value.is_ascii_hexdigit()))
    {
        return Err("Invalid title.".into());
    }
    Ok(())
}

fn validate_transition(transition: &Transition, duration: i64) -> Result<(), String> {
    if !crate::creative::valid_transition(&transition.kind)
        || transition.frames < 1
        || transition.frames > duration
    {
        return Err("Invalid transition.".into());
    }
    Ok(())
}

fn validate_source(project: &Project, clip: &Clip) -> Result<(), String> {
    let Some(media_id) = &clip.media_id else {
        return if clip.title.is_some() {
            Ok(())
        } else {
            Err("A clip has no media or title.".into())
        };
    };
    let asset = project
        .assets
        .iter()
        .find(|asset| &asset.id == media_id)
        .ok_or("A clip references missing media metadata.")?;
    if asset.kind != "image"
        && clip.source_in + project.fps.seconds(clip.duration)
            > asset.duration + project.fps.seconds(1) + 0.001
    {
        return Err("The edit extends beyond the source media.".into());
    }
    Ok(())
}
