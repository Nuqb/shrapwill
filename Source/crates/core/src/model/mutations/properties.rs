use super::super::*;
pub(super) fn apply(p: &mut Project, edit: Edit) -> Result<(), String> {
    match edit {
        Edit::Properties { id, props } => properties(p, id, props),
        Edit::SetTitle { id, title } => set_title(p, id, title),
        Edit::SetTransition { id, kind, frames } => set_transition(p, id, kind, frames),
        Edit::Relink { media_id, asset } => relink(p, media_id, asset),
        _ => unreachable!("edit routed to the wrong mutation group"),
    }
}

fn properties(p: &mut Project, id: String, props: Properties) -> Result<(), String> {
    let selected = vec![id.clone()];
    ensure_unlocked(p, &selected)?;
    let clip = find_mut(p, &id)?;
    for (next, previous, family) in [
        (
            &props.original_filter,
            &clip.props.original_filter,
            "filter",
        ),
        (
            &props.original_effect,
            &clip.props.original_effect,
            "effect",
        ),
    ] {
        if next != previous && !crate::transition_sources::available_property(next, family) {
            return Err("This original preset is not yet available.".into());
        }
    }
    clip.props = props;

    Ok(())
}

fn set_title(p: &mut Project, id: String, title: Title) -> Result<(), String> {
    ensure_unlocked(p, std::slice::from_ref(&id))?;
    let c = find_mut(p, &id)?;
    c.name = title
        .text
        .lines()
        .next()
        .unwrap_or("Title")
        .chars()
        .take(80)
        .collect();
    c.title = Some(Title {
        image_path: None,
        ..title
    });

    Ok(())
}

fn set_transition(p: &mut Project, id: String, kind: String, frames: i64) -> Result<(), String> {
    ensure_unlocked(p, std::slice::from_ref(&id))?;
    if kind == "none" {
        find_mut(p, &id)?.transition = None;
        return Ok(());
    }
    let (frames, delta) = transition_placement(p, &id, &kind, frames)?;
    if delta != 0 {
        let linked = linked_ids(p, std::slice::from_ref(&id));
        ensure_unlocked(p, &linked)?;
        for clip in p
            .tracks
            .iter_mut()
            .flat_map(|track| &mut track.clips)
            .filter(|c| linked.contains(&c.id))
        {
            clip.start = clip
                .start
                .checked_add(delta)
                .filter(|start| *start >= 0)
                .ok_or("The transition would move linked media before the timeline starts.")?;
        }
    }
    find_mut(p, &id)?.transition = Some(Transition { kind, frames });
    Ok(())
}

fn transition_placement(
    p: &Project,
    id: &str,
    kind: &str,
    frames: i64,
) -> Result<(i64, i64), String> {
    if crate::transition_sources::unavailable(kind) {
        return Err(
            "The original transition has not been ported; the earlier approximation is disabled."
                .into(),
        );
    }
    let (track, clip) = p.clip(id).ok_or("Clip not found.")?;
    if track.kind != "video" {
        return Err("Transitions belong on video tracks.".into());
    }
    let frames = frames.max(1).min(clip.duration);
    let previous = track
        .clips
        .iter()
        .filter(|c| c.id != id && c.start < clip.start)
        .max_by_key(|c| c.start);
    if kind == "fade" && previous.is_none() {
        return Ok((frames, 0));
    }
    let prev =
        previous.ok_or("Place this clip after another clip on the same video track first.")?;
    // Keep distinct start times so repeated applications always identify the same predecessor.
    if prev.duration < 2 {
        return Err("The preceding clip needs at least two frames for a transition.".into());
    }
    let frames = frames.min(prev.duration - 1);
    Ok((frames, prev.start + prev.duration - frames - clip.start))
}

fn relink(p: &mut Project, media_id: String, mut asset: MediaAsset) -> Result<(), String> {
    asset.id = media_id.clone();
    let a = p
        .assets
        .iter_mut()
        .find(|a| a.id == media_id)
        .ok_or("Media not found.")?;
    *a = asset;

    Ok(())
}
