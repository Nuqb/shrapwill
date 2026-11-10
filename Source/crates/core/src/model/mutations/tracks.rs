use super::super::*;
pub(super) struct TrackUpdate {
    pub id: String,
    pub locked: Option<bool>,
    pub muted: Option<bool>,
    pub visible: Option<bool>,
}
pub(super) fn apply(p: &mut Project, edit: Edit) -> Result<(), String> {
    match edit {
        Edit::Rename { name } => rename(p, name),
        Edit::AddTrack { kind } => add_track(p, kind),
        Edit::DeleteTracks { ids } => delete_tracks(p, ids),
        Edit::SetTrack {
            id,
            locked,
            muted,
            visible,
        } => set_track(
            p,
            TrackUpdate {
                id,
                locked,
                muted,
                visible,
            },
        ),
        _ => unreachable!("edit routed to the wrong mutation group"),
    }
}

fn rename(p: &mut Project, name: String) -> Result<(), String> {
    p.name = name.chars().take(120).collect();

    Ok(())
}

fn add_track(p: &mut Project, kind: String) -> Result<(), String> {
    if !["video", "audio"].contains(&kind.as_str()) {
        return Err("Unknown track type.".into());
    }
    let n = p.tracks.iter().filter(|t| t.kind == kind).count() + 1;
    let t = Track {
        id: id(),
        name: format!("{} {}", if kind == "video" { "Video" } else { "Audio" }, n),
        kind: kind.clone(),
        locked: false,
        muted: false,
        visible: true,
        clips: vec![],
    };
    if kind == "video" {
        p.tracks.insert(0, t)
    } else {
        p.tracks.push(t)
    }

    Ok(())
}

fn delete_tracks(p: &mut Project, ids: Vec<String>) -> Result<(), String> {
    if ids.is_empty() || ids.iter().any(|id| !p.tracks.iter().any(|t| &t.id == id)) {
        return Err("Select existing tracks to delete.".into());
    }
    if p.tracks.iter().any(|t| ids.contains(&t.id) && t.locked) {
        return Err("Unlock the selected tracks before deleting them.".into());
    }
    p.tracks.retain(|t| !ids.contains(&t.id));
    // Removing a lane removes only its contents, not footage on other lanes.
    let mut counts = std::collections::HashMap::new();
    for link in p
        .tracks
        .iter()
        .flat_map(|t| &t.clips)
        .filter_map(|c| c.link.as_ref())
    {
        *counts.entry(link.clone()).or_insert(0) += 1;
    }
    for c in p.tracks.iter_mut().flat_map(|t| &mut t.clips) {
        if c.link
            .as_ref()
            .is_some_and(|link| counts.get(link) == Some(&1))
        {
            c.link = None;
        }
    }

    Ok(())
}

fn set_track(p: &mut Project, update: TrackUpdate) -> Result<(), String> {
    let TrackUpdate {
        id,
        locked,
        muted,
        visible,
    } = update;
    let t = p
        .tracks
        .iter_mut()
        .find(|t| t.id == id)
        .ok_or("Track not found.")?;
    if let Some(v) = locked {
        t.locked = v
    }
    if let Some(v) = muted {
        t.muted = v
    }
    if let Some(v) = visible {
        t.visible = v
    }

    Ok(())
}
