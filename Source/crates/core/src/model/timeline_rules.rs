use super::*;

// Editing guards apply to new placements, not project loading: older projects and
// explicit transition overlaps remain compatible.
pub(super) fn check_placement(
    before: &Project,
    after: &Project,
    edit: &Edit,
) -> Result<(), String> {
    if !matches!(
        edit,
        Edit::Move { .. } | Edit::Trim { .. } | Edit::AddClip { .. } | Edit::AddTitle { .. }
    ) {
        return Ok(());
    }
    check_overlaps(before, after)
}

pub(super) fn check_overlaps(before: &Project, after: &Project) -> Result<(), String> {
    for track in &after.tracks {
        let mut clips: Vec<_> = track.clips.iter().collect();
        clips.sort_by_key(|c| c.start);
        for (i, a) in clips.iter().enumerate() {
            for b in clips
                .iter()
                .skip(i + 1)
                .take_while(|b| b.start < a.start + a.duration)
            {
                let old = before.clip(&a.id).zip(before.clip(&b.id));
                let allowed = old
                    .filter(|((ta, _), (tb, _))| ta.id == tb.id)
                    .map(|((_, a), (_, b))| overlap(a, b))
                    .unwrap_or(0);
                if overlap(a, b) > allowed {
                    return Err("Clips cannot overlap on the same track. Choose an empty position or another track.".into());
                }
            }
        }
    }
    Ok(())
}

fn overlap(a: &Clip, b: &Clip) -> i64 {
    (a.start + a.duration)
        .min(b.start + b.duration)
        .saturating_sub(a.start.max(b.start))
        .max(0)
}

pub(super) fn validate_ripple_delete(
    p: &Project,
    selected: &[String],
    spans: &[(i64, i64)],
) -> Result<(), String> {
    let shifts = p
        .tracks
        .iter()
        .flat_map(|t| t.clips.iter().map(move |c| (t, c)))
        .filter(|(_, c)| !selected.contains(&c.id))
        .map(|(t, c)| {
            let shift = if t.locked {
                0
            } else {
                spans
                    .iter()
                    .filter(|(_, end)| *end <= c.start)
                    .map(|(start, end)| end - start)
                    .sum::<i64>()
            };
            (c.id.clone(), shift)
        })
        .collect::<std::collections::HashMap<_, _>>();
    for (id, shift) in &shifts {
        for partner in linked_ids(p, std::slice::from_ref(id)) {
            if shifts.get(&partner).is_some_and(|value| value != shift) {
                return Err("Unlock linked tracks before using Auto Ripple.".into());
            }
        }
    }
    Ok(())
}

pub(super) fn auto_ripple(before: &Project, p: &mut Project, edit: &Edit) -> Result<(), String> {
    if !p.auto_ripple {
        return Ok(());
    }
    match edit {
        Edit::Trim { id, .. } => ripple_trim(before, p, id),
        _ => Ok(()),
    }
}

fn magnet_ids(p: &Project) -> Vec<String> {
    if !p.magnetic_timeline {
        return vec![];
    }
    let main = main_timing(p)
        .into_iter()
        .map(|(id, _, _)| id)
        .collect::<Vec<_>>();
    linked_ids(p, &main)
}

fn shift_following(
    p: &mut Project,
    boundary: i64,
    delta: i64,
    excluded: &[String],
) -> Result<(), String> {
    let moving = p
        .tracks
        .iter()
        .filter(|t| !t.locked)
        .flat_map(|t| &t.clips)
        .filter(|c| c.start >= boundary && !excluded.contains(&c.id))
        .map(|c| c.id.clone())
        .collect::<Vec<_>>();
    let moving = linked_ids(p, &moving);
    if delta != 0 {
        ensure_unlocked(p, &moving)?;
    }
    for track in &mut p.tracks {
        for clip in &mut track.clips {
            if !moving.contains(&clip.id) {
                continue;
            }
            clip.start = clip
                .start
                .checked_add(delta)
                .filter(|s| *s >= 0)
                .ok_or("The ripple edit would move a clip outside the timeline.")?;
        }
    }
    Ok(())
}

fn ripple_trim(before: &Project, p: &mut Project, id: &str) -> Result<(), String> {
    let old = before.clip(id).ok_or("Clip not found.")?.1;
    let new = p.clip(id).ok_or("Clip not found.")?.1.clone();
    let affected = linked_ids(before, &[id.to_string()]);
    let delta = new.duration - old.duration;
    let mut excluded = magnet_ids(before);
    if !excluded.contains(&id.to_string()) {
        excluded.clear();
    }
    // Magnetic normalization handles main-track trims and their linked partners.
    if !excluded.contains(&id.to_string()) {
        for track in &mut p.tracks {
            for clip in &mut track.clips {
                if affected.contains(&clip.id) {
                    clip.start += old.start - new.start;
                }
            }
        }
    }
    excluded.extend(affected);
    shift_following(p, old.start + old.duration, delta, &excluded)
}

pub(super) fn ripple_insert(before: &Project, p: &mut Project) -> Result<(), String> {
    let added = p
        .tracks
        .iter()
        .flat_map(|t| &t.clips)
        .filter(|c| before.clip(&c.id).is_none())
        .collect::<Vec<_>>();
    let Some(start) = added.iter().map(|c| c.start).min() else {
        return Ok(());
    };
    let end = added.iter().map(|c| c.start + c.duration).max().unwrap();
    let mut excluded = added.iter().map(|c| c.id.clone()).collect::<Vec<_>>();
    let boundary = insertion_boundary(before, p, &added, start);
    let magnetic_insert = p.magnetic_timeline && main_timing(p).len() != main_timing(before).len();
    let boundary = if magnetic_insert { start } else { boundary };
    for clip in p.tracks.iter_mut().flat_map(|t| &mut t.clips) {
        if excluded.contains(&clip.id) {
            clip.start += boundary - start;
        }
    }
    if main_timing(p).len() != main_timing(before).len() {
        excluded.extend(magnet_ids(before));
    }
    shift_following(p, boundary, end - start, &excluded)
}

fn insertion_boundary(before: &Project, after: &Project, added: &[&Clip], start: i64) -> i64 {
    let Some(first) = added.iter().find(|c| c.start == start) else {
        return start;
    };
    let target = after.clip(&first.id).map(|(t, _)| &t.id);
    // Insert at the nearest edge of the occupied clip rather than layering it.
    before
        .tracks
        .iter()
        .find(|t| Some(&t.id) == target)
        .and_then(|t| {
            t.clips
                .iter()
                .find(|c| c.start < start && c.start + c.duration > start)
        })
        .map(|c| {
            if start - c.start < c.duration / 2 {
                c.start
            } else {
                c.start + c.duration
            }
        })
        .unwrap_or(start)
}
