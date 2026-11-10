use super::*;
pub(super) fn main_timing(p: &Project) -> Vec<(String, i64, i64)> {
    p.tracks
        .iter()
        .rev()
        .find(|t| t.kind == "video")
        .map(|t| {
            t.clips
                .iter()
                .map(|c| (c.id.clone(), c.start, c.duration))
                .collect()
        })
        .unwrap_or_default()
}
fn shift_linked(p: &mut Project, ids: &[String], delta: i64) -> Result<(), String> {
    if delta == 0 {
        return Ok(());
    }
    let selected = linked_ids(p, ids);
    ensure_unlocked(p, &selected)?;
    for c in p
        .tracks
        .iter()
        .flat_map(|t| &t.clips)
        .filter(|c| selected.contains(&c.id))
    {
        if c.start
            .checked_add(delta)
            .is_none_or(|start| start < 0 || start > i64::MAX - c.duration)
        {
            return Err("The magnetic edit would move a linked clip outside the timeline.".into());
        }
    }
    for c in p
        .tracks
        .iter_mut()
        .flat_map(|t| &mut t.clips)
        .filter(|c| selected.contains(&c.id))
    {
        c.start += delta;
    }
    Ok(())
}
pub(super) fn insert_main_clips(p: &mut Project, ids: &[String]) -> Result<(), String> {
    let Some(ti) = p.tracks.iter().rposition(|t| t.kind == "video") else {
        return Ok(());
    };
    let inserted: Vec<_> = p.tracks[ti]
        .clips
        .iter()
        .filter(|c| ids.contains(&c.id))
        .cloned()
        .collect();
    let main_ids: Vec<_> = inserted.iter().map(|c| c.id.clone()).collect();
    let Some(origin) = inserted.iter().map(|c| c.start).min() else {
        return Ok(());
    };
    let end = inserted.iter().map(|c| c.start + c.duration).max().unwrap();
    let mut remaining: Vec<_> = p.tracks[ti]
        .clips
        .iter()
        .filter(|c| !ids.contains(&c.id))
        .cloned()
        .collect();
    remaining.sort_by_key(|c| c.start);
    // Treat existing overlapping clips as one group, so inserting never breaks a dissolve.
    let mut groups: Vec<(String, i64, i64)> = vec![];
    for c in remaining {
        if let Some(last) = groups.last_mut() {
            if c.start < last.2 {
                last.2 = last.2.max(c.start + c.duration);
                continue;
            }
        }
        groups.push((c.id, c.start, c.start + c.duration));
    }
    let anchor = groups
        .iter()
        .find(|(_, start, end)| origin <= start + (end - start) / 2)
        .map(|(id, _, _)| id.clone());
    p.tracks[ti].clips.retain(|c| !ids.contains(&c.id));
    close_main_gaps(p)?;
    let boundary = anchor
        .and_then(|id| p.clip(&id).map(|(_, c)| c.start))
        .unwrap_or_else(|| {
            p.tracks[ti]
                .clips
                .iter()
                .map(|c| c.start + c.duration)
                .max()
                .unwrap_or(0)
        });
    let downstream: Vec<_> = p.tracks[ti]
        .clips
        .iter()
        .filter(|c| c.start >= boundary)
        .map(|c| c.id.clone())
        .collect();
    shift_linked(p, &downstream, end - origin)?;
    p.tracks[ti].clips.extend(inserted);
    shift_linked(p, &main_ids, boundary - origin)?;
    Ok(())
}
pub(super) fn close_main_gaps(p: &mut Project) -> Result<(), String> {
    let Some(main) = p.tracks.iter().rev().find(|t| t.kind == "video") else {
        return Ok(());
    };
    let mut ordered = main.clips.clone();
    ordered.sort_by_key(|c| c.start);
    // Remove only empty intervals. Preserve intentional overlaps/dissolves and source timing.
    let mut covered = 0;
    let mut removed = 0;
    let mut shifts = std::collections::HashMap::new();
    for c in ordered {
        if c.start > covered {
            removed += c.start - covered;
        }
        covered = covered.max(c.start + c.duration);
        for cid in linked_ids(p, &[c.id]) {
            if shifts
                .insert(cid, -removed)
                .is_some_and(|old| old != -removed)
            {
                return Err("Detach clips linked across different gaps before enabling the magnetic timeline.".into());
            }
        }
    }
    // Validate every linked move before changing anything: a locked partner must never drift.
    for t in &p.tracks {
        for c in &t.clips {
            let delta = shifts.get(&c.id).copied().unwrap_or(0);
            if delta != 0 && t.locked {
                return Err(
                    "Unlock the main track and its linked audio before closing gaps.".into(),
                );
            }
            if c.start.checked_add(delta).is_none_or(|start| start < 0) {
                return Err("A linked clip would move before the timeline starts. Detach it before closing gaps.".into());
            }
        }
    }
    for t in &mut p.tracks {
        for c in &mut t.clips {
            c.start += shifts.get(&c.id).copied().unwrap_or(0);
        }
    }
    Ok(())
}

pub(super) struct MagneticEdit {
    enable_magnet: bool,
    deleting_tracks: bool,
    insertion: Option<Vec<String>>,
    trimmed: Option<Clip>,
}
impl MagneticEdit {
    pub(super) fn capture(p: &Project, edit: &Edit) -> Self {
        let enable_magnet = matches!(edit, Edit::SetMagneticTimeline { enabled: true });
        let deleting_tracks = matches!(edit, Edit::DeleteTracks { .. });
        let insertion = match edit {
            Edit::Move { ids, .. } => Some(linked_ids(p, ids)),
            Edit::AddClip { .. } => Some(vec![]),
            _ => None,
        };
        let trimmed = match edit {
            Edit::Trim { id, .. } => {
                let selected = linked_ids(p, std::slice::from_ref(id));
                p.tracks
                    .iter()
                    .rev()
                    .find(|t| t.kind == "video")
                    .and_then(|t| t.clips.iter().find(|c| selected.contains(&c.id)))
                    .cloned()
            }
            _ => None,
        };

        Self {
            enable_magnet,
            deleting_tracks,
            insertion,
            trimmed,
        }
    }
    pub(super) fn finish(self, before: &Project, p: &mut Project) -> Result<(), String> {
        let Self {
            enable_magnet,
            deleting_tracks,
            insertion,
            trimmed,
        } = self;

        if p.magnetic_timeline
            && !deleting_tracks
            && (enable_magnet || main_timing(p) != main_timing(before))
        {
            p.validate()?;
            if let Some(original) = trimmed {
                let edited = p.clip(&original.id).ok_or("Clip not found.")?.1.clone();
                // Trimming keeps the clip's place in the sequence and ripples its new length.
                shift_linked(
                    p,
                    std::slice::from_ref(&edited.id),
                    original.start - edited.start,
                )?;
                let following: Vec<_> = main_timing(before)
                    .into_iter()
                    .filter(|(_, start, _)| *start >= original.start + original.duration)
                    .map(|(id, _, _)| id)
                    .collect();
                shift_linked(p, &following, edited.duration - original.duration)?;
            }
            if let Some(mut ids) = insertion {
                if ids.is_empty() {
                    ids = main_timing(p)
                        .into_iter()
                        .filter(|(id, _, _)| before.clip(id).is_none())
                        .map(|(id, _, _)| id)
                        .collect();
                }
                insert_main_clips(p, &ids)?;
            }
            close_main_gaps(p)?;
        }

        Ok(())
    }
}
