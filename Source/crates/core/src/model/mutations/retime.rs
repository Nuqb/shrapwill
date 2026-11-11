use super::super::*;

pub(super) fn apply(
    p: &mut Project,
    id: String,
    asset: MediaAsset,
    settings: Option<Box<SpeedSettings>>,
    ripple: bool,
) -> Result<(), String> {
    let selected = linked_ids(p, std::slice::from_ref(&id));
    ensure_unlocked(p, &selected)?;
    let original = p.clip(&id).ok_or("Clip not found.")?.1.clone();
    let duration = p.fps.frames(asset.duration).max(1);
    let delta = duration - original.duration;
    let boundary = original.start + original.duration;
    if ripple
        && p.tracks
            .iter()
            .any(|t| t.locked && t.clips.iter().any(|c| c.start >= boundary))
    {
        return Err("Unlock downstream tracks before using ripple speed editing.".into());
    }
    for track in &mut p.tracks {
        for clip in &mut track.clips {
            if selected.contains(&clip.id) {
                if clip.duration != original.duration
                    || clip.source_in != original.source_in
                    || clip.media_id != original.media_id
                {
                    return Err(
                        "Linked clips must have matching source ranges for speed editing.".into(),
                    );
                }
                clip.props.speed = settings.clone();
                clip.media_id = Some(asset.id.clone());
                clip.source_in = 0.;
                clip.duration = duration;
                clip.props.fade_in = clip.props.fade_in.min(duration);
                clip.props.fade_out = clip.props.fade_out.min(duration);
                if let Some(transition) = &mut clip.transition {
                    transition.frames = transition.frames.min(duration);
                }
            } else if ripple && clip.start >= boundary {
                clip.start += delta;
            }
        }
    }
    p.assets.push(asset);
    Ok(())
}
