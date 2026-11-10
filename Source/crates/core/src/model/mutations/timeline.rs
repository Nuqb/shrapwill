use super::super::*;
pub(super) fn apply(p: &mut Project, edit: Edit) -> Result<(), String> {
    match edit {
        Edit::Move {
            ids,
            delta,
            target_track,
        } => move_clips(p, ids, delta, target_track),
        Edit::Trim { id, edge, frame } => trim(p, id, edge, frame),
        Edit::Split { ids, frame } => split(p, ids, frame),
        _ => unreachable!("edit routed to the wrong mutation group"),
    }
}

fn move_clips(
    p: &mut Project,
    ids: Vec<String>,
    delta: i64,
    target_track: Option<String>,
) -> Result<(), String> {
    let selected = linked_ids(p, &ids);
    ensure_unlocked(p, &selected)?;
    let earliest = p
        .tracks
        .iter()
        .flat_map(|t| &t.clips)
        .filter(|c| selected.contains(&c.id))
        .map(|c| c.start)
        .min()
        .unwrap_or(0);
    let delta = delta.max(-earliest);
    let single = ids
        .first()
        .and_then(|x| p.clip(x))
        .map(|(t, _)| (t.id.clone(), t.kind.clone()));
    for t in &mut p.tracks {
        for c in &mut t.clips {
            if selected.contains(&c.id) {
                c.start += delta
            }
        }
    }
    if let (Some(target), Some((source, kind))) = (target_track, single) {
        if target != source {
            let dest = p
                .tracks
                .iter()
                .find(|t| t.id == target)
                .ok_or("Track not found.")?;
            if dest.locked || dest.kind != kind {
                return Err("Choose an unlocked track of the same type.".into());
            }
            let ti = p.tracks.iter().position(|t| t.id == source).unwrap();
            let mut moved = vec![];
            p.tracks[ti].clips.retain(|c| {
                if ids.contains(&c.id) {
                    moved.push(c.clone());
                    false
                } else {
                    true
                }
            });
            p.tracks
                .iter_mut()
                .find(|t| t.id == target)
                .unwrap()
                .clips
                .extend(moved);
        }
    }

    Ok(())
}

fn trim(p: &mut Project, id: String, edge: String, frame: i64) -> Result<(), String> {
    let selected = linked_ids(p, std::slice::from_ref(&id));
    ensure_unlocked(p, &selected)?;
    let (_, original) = p.clip(&id).ok_or("Clip not found.")?;
    let original = original.clone();
    let mut delta = if edge == "left" {
        frame - original.start
    } else {
        frame - (original.start + original.duration)
    };
    for (_, c) in p
        .tracks
        .iter()
        .flat_map(|t| t.clips.iter().map(move |c| (t, c)))
        .filter(|(_, c)| selected.contains(&c.id))
    {
        if edge == "left" {
            delta = delta
                .max(-p.fps.frames(c.source_in))
                .max(-c.start)
                .min(c.duration - 1)
        } else {
            delta = delta.max(1 - c.duration);
            if let Some(a) = c
                .media_id
                .as_ref()
                .and_then(|mid| p.assets.iter().find(|a| &a.id == mid))
            {
                if a.kind != "image" {
                    delta = delta
                        .min(((a.duration - c.source_in) * p.fps.fps()).floor() as i64 - c.duration)
                }
            }
        }
    }
    for t in &mut p.tracks {
        for c in &mut t.clips {
            if selected.contains(&c.id) {
                if edge == "left" {
                    c.start += delta;
                    c.duration -= delta;
                    c.source_in = (c.source_in + p.fps.seconds(delta)).max(0.)
                } else {
                    c.duration += delta
                }
                c.props.fade_in = c.props.fade_in.min(c.duration);
                c.props.fade_out = c.props.fade_out.min(c.duration);
                if let Some(tr) = &mut c.transition {
                    tr.frames = tr.frames.min(c.duration)
                }
            }
        }
    }

    Ok(())
}

fn split(p: &mut Project, ids: Vec<String>, frame: i64) -> Result<(), String> {
    let selected = linked_ids(p, &ids);
    ensure_unlocked(p, &selected)?;
    let mut right_links = std::collections::HashMap::new();
    for t in &mut p.tracks {
        let mut added = vec![];
        for c in &mut t.clips {
            if selected.contains(&c.id) && frame > c.start && frame < c.start + c.duration {
                let mut r = c.clone();
                r.id = id();
                r.start = frame;
                r.duration = c.start + c.duration - frame;
                r.source_in += p.fps.seconds(frame - c.start);
                r.transition = None;
                r.link = c
                    .link
                    .as_ref()
                    .map(|k| right_links.entry(k.clone()).or_insert_with(id).clone());
                c.duration = frame - c.start;
                if let Some(tr) = &mut c.transition {
                    tr.frames = tr.frames.min(c.duration)
                }
                added.push(r)
            }
        }
        t.clips.extend(added)
    }

    Ok(())
}
