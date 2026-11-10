use super::super::*;
pub(super) fn apply(p: &mut Project, edit: Edit) -> Result<(), String> {
    match edit {
        Edit::Delete { ids, ripple } => delete(p, ids, ripple),
        Edit::DetachAudio { id: cid } => detach_audio(p, cid),
        _ => unreachable!("edit routed to the wrong mutation group"),
    }
}

fn delete(p: &mut Project, ids: Vec<String>, ripple: bool) -> Result<(), String> {
    let selected = linked_ids(p, &ids);
    ensure_unlocked(p, &selected)?;
    let mut spans: Vec<(i64, i64)> = p
        .tracks
        .iter()
        .flat_map(|t| &t.clips)
        .filter(|c| selected.contains(&c.id))
        .map(|c| (c.start, c.start + c.duration))
        .collect();
    spans.sort();
    let mut merged: Vec<(i64, i64)> = vec![];
    for (s, e) in spans {
        if let Some(last) = merged.last_mut() {
            if s <= last.1 {
                last.1 = last.1.max(e);
                continue;
            }
        }
        merged.push((s, e))
    }
    for t in &mut p.tracks {
        t.clips.retain(|c| !selected.contains(&c.id));
        if ripple && !t.locked {
            for c in &mut t.clips {
                let shift: i64 = merged
                    .iter()
                    .filter(|(_, e)| *e <= c.start)
                    .map(|(s, e)| e - s)
                    .sum();
                c.start -= shift;
            }
        }
    }

    Ok(())
}

fn detach_audio(p: &mut Project, cid: String) -> Result<(), String> {
    ensure_unlocked(p, std::slice::from_ref(&cid))?;
    let (t, c) = p.clip(&cid).ok_or("Clip not found.")?;
    if t.kind != "video" || !c.audio_enabled || c.title.is_some() {
        return Err("This clip has no attached audio.".into());
    }
    let mut a = c.clone();
    let link = id();
    a.id = id();
    a.link = Some(link.clone());
    a.transition = None;
    let c = find_mut(p, &cid)?;
    c.audio_enabled = false;
    c.link = Some(link);
    if let Some(t) = p.tracks.iter_mut().find(|t| t.kind == "audio" && !t.locked) {
        t.clips.push(a)
    } else {
        p.tracks.push(Track {
            id: id(),
            name: "Detached audio".into(),
            kind: "audio".into(),
            locked: false,
            muted: false,
            visible: true,
            clips: vec![a],
        })
    }

    Ok(())
}
