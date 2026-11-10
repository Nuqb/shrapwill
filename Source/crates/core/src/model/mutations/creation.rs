use super::super::*;
pub(super) fn apply(p: &mut Project, edit: Edit) -> Result<(), String> {
    match edit {
        Edit::AddClip {
            media_id,
            track_id,
            start,
        } => add_clip(p, media_id, track_id, start),
        Edit::AddTitle {
            track_id,
            start,
            style,
        } => add_title(p, track_id, start, style),
        _ => unreachable!("edit routed to the wrong mutation group"),
    }
}

fn add_clip(p: &mut Project, media_id: String, track_id: String, start: i64) -> Result<(), String> {
    let a = p
        .assets
        .iter()
        .find(|a| a.id == media_id)
        .ok_or("Media not found.")?
        .clone();
    let duration = if a.kind == "image" {
        p.fps.frames(5.)
    } else {
        ((a.duration * p.fps.fps() + 0.0001).floor() as i64).max(1)
    };
    let t = p
        .tracks
        .iter_mut()
        .find(|t| t.id == track_id)
        .ok_or("Track not found.")?;
    validate_destination(t, &a)?;
    t.clips.push(Clip {
        id: id(),
        media_id: Some(media_id),
        name: a.name,
        start: start.max(0),
        duration,
        source_in: 0.,
        link: None,
        audio_enabled: a.has_audio,
        props: Properties::default(),
        title: None,
        transition: None,
    });

    Ok(())
}

fn add_title(p: &mut Project, track_id: String, start: i64, style: String) -> Result<(), String> {
    let duration = p.fps.frames(5.);
    let automatic = track_id.is_empty();
    let track_id = title_track(p, track_id);
    let t = p
        .tracks
        .iter_mut()
        .find(|t| t.id == track_id)
        .ok_or("Track not found.")?;
    if t.kind != "video" || t.locked {
        return Err("Choose an unlocked video track.".into());
    }
    let start = if automatic {
        free_title_start(t, start.max(0), duration)
    } else {
        start.max(0)
    };
    t.clips.push(title_clip(start, duration, style));
    Ok(())
}
fn title_track(p: &mut Project, track_id: String) -> String {
    if !track_id.is_empty() {
        return track_id;
    }
    if let Some(track) = p.tracks.iter().find(|t| {
        t.kind == "video"
            && !t.locked
            && (t.name.starts_with("Titles")
                || (!t.clips.is_empty() && t.clips.iter().all(|c| c.title.is_some())))
    }) {
        return track.id.clone();
    }
    let tid = id();
    p.tracks.insert(
        0,
        Track {
            id: tid.clone(),
            name: format!(
                "Titles {}",
                p.tracks.iter().filter(|t| t.kind == "video").count()
            ),
            kind: "video".into(),
            locked: false,
            muted: false,
            visible: true,
            clips: vec![],
        },
    );
    tid
}
fn free_title_start(t: &Track, mut start: i64, duration: i64) -> i64 {
    let mut occupied: Vec<_> = t.clips.iter().collect();
    occupied.sort_by_key(|c| c.start);
    for c in occupied {
        if c.start + c.duration <= start {
            continue;
        }
        if start
            .checked_add(duration)
            .is_some_and(|end| end <= c.start)
        {
            break;
        }
        start = c.start + c.duration;
    }
    start
}
fn title_clip(start: i64, duration: i64, style: String) -> Clip {
    let title = Title::preset(style);
    Clip {
        id: id(),
        media_id: None,
        name: title.text.lines().next().unwrap_or("Title").into(),
        start,
        duration,
        source_in: 0.,
        link: None,
        audio_enabled: false,
        props: Properties::default(),
        title: Some(title),
        transition: None,
    }
}

fn validate_destination(t: &Track, a: &MediaAsset) -> Result<(), String> {
    if t.locked {
        return Err("Unlock this track before editing.".into());
    }
    if t.kind == "video" && a.kind == "audio" {
        return Err("Drop audio files onto an audio track.".into());
    }
    if t.kind == "audio" && (a.kind == "image" || !a.has_audio) {
        return Err("This media has no audio.".into());
    }

    Ok(())
}
