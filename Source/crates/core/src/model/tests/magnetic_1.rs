use super::*;

#[test]
fn magnetic_insert_and_reorder_make_room_instead_of_overlapping() {
    let mut e = magnetic_fixture();
    let last = e.project.tracks[0]
        .clips
        .iter()
        .find(|c| c.start == 200)
        .unwrap()
        .id
        .clone();
    e.apply(Edit::Move {
        ids: vec![last.clone()],
        delta: -200,
        target_track: None,
    })
    .unwrap();
    assert_eq!(e.project.clip(&last).unwrap().1.start, 0);
    assert_eq!(starts(&e, 0), vec![0, 100, 200]);
    assert_eq!(starts(&e, 1), vec![0, 100, 200]);
    let media_id = e.project.assets[0].id.clone();
    let track_id = e.project.tracks[0].id.clone();
    e.apply(Edit::AddClip {
        media_id,
        track_id,
        start: 100,
    })
    .unwrap();
    assert_eq!(starts(&e, 0), vec![0, 100, 400, 500]);
    assert_eq!(starts(&e, 1), vec![0, 400, 500]);
}

#[test]
fn magnetic_extending_trim_pushes_following_linked_clips_right() {
    let mut e = magnetic_fixture();
    let first = e.project.tracks[0].clips[0].id.clone();
    e.apply(Edit::Trim {
        id: first.clone(),
        edge: "right".into(),
        frame: 150,
    })
    .unwrap();
    assert_eq!(starts(&e, 0), vec![0, 150, 250]);
    assert_eq!(starts(&e, 1), vec![0, 150, 250]);
    assert_eq!(e.project.clip(&first).unwrap().1.duration, 150);
    e.undo();
    assert_eq!(starts(&e, 0), vec![0, 100, 200]);
}

#[test]
fn magnetic_delete_closes_only_main_and_linked_audio_in_one_history_step() {
    let mut e = magnetic_fixture();
    let middle = e.project.tracks[0]
        .clips
        .iter()
        .find(|c| c.start == 100)
        .unwrap()
        .id
        .clone();
    let mut overlay = e.project.tracks[0].clone();
    overlay.id = id();
    overlay.clips.truncate(1);
    overlay.clips[0].id = id();
    overlay.clips[0].link = None;
    overlay.clips[0].start = 250;
    e.project.tracks.insert(0, overlay);
    let revision = e.revision;
    e.apply(Edit::Delete {
        ids: vec![middle],
        ripple: false,
    })
    .unwrap();
    assert_eq!(starts(&e, 1), vec![0, 100]);
    assert_eq!(starts(&e, 2), vec![0, 100]);
    assert_eq!(starts(&e, 0), vec![250]);
    assert_eq!(e.revision, revision + 1);
    e.undo();
    assert_eq!(starts(&e, 1), vec![0, 100, 200]);
    e.redo();
    assert_eq!(starts(&e, 1), vec![0, 100]);
}

#[test]
fn magnetic_trims_close_gaps_without_changing_source_content() {
    let mut e = magnetic_fixture();
    let cid = e.project.tracks[0].clips[0].id.clone();
    e.apply(Edit::Trim {
        id: cid.clone(),
        edge: "right".into(),
        frame: 60,
    })
    .unwrap();
    assert_eq!(starts(&e, 0), vec![0, 60, 160]);
    assert_eq!(starts(&e, 1), vec![0, 60, 160]);
    e.undo();
    e.apply(Edit::Trim {
        id: cid.clone(),
        edge: "left".into(),
        frame: 40,
    })
    .unwrap();
    let (_, c) = e.project.clip(&cid).unwrap();
    assert_eq!((c.start, c.duration), (0, 60));
    assert!((c.source_in - 40. / 30.).abs() < 1e-9);
    assert_eq!(starts(&e, 0), vec![0, 60, 160]);
    assert_eq!(starts(&e, 1), vec![0, 60, 160]);
}

#[test]
fn magnetic_moves_additions_and_paste_leave_no_empty_main_intervals() {
    let mut e = magnetic_fixture();
    let cid = e.project.tracks[0]
        .clips
        .iter()
        .find(|c| c.start == 100)
        .unwrap()
        .id
        .clone();
    e.apply(Edit::Move {
        ids: vec![cid.clone()],
        delta: 400,
        target_track: None,
    })
    .unwrap();
    assert_eq!(starts(&e, 0), vec![0, 100, 200]);
    assert_eq!(e.project.clip(&cid).unwrap().1.start, 200);
    assert_eq!(starts(&e, 1), vec![0, 100, 200]);
    e.copy_clips(&[cid]).unwrap();
    let pasted = e.paste_clips(900).unwrap();
    assert_eq!(e.project.clip(&pasted[0]).unwrap().1.start, 300);
    assert_eq!(starts(&e, 1), vec![0, 100, 200, 300]);
    let media_id = e.project.assets[0].id.clone();
    let track_id = e.project.tracks[0].id.clone();
    e.apply(Edit::AddClip {
        media_id,
        track_id,
        start: 1200,
    })
    .unwrap();
    assert_eq!(starts(&e, 0), vec![0, 100, 200, 300, 400]);
}

#[test]
fn magnetic_cut_and_explicit_ripple_do_not_double_close() {
    let mut e = magnetic_fixture();
    let cid = e.project.tracks[0]
        .clips
        .iter()
        .find(|c| c.start == 100)
        .unwrap()
        .id
        .clone();
    e.clipboard_action("cut", &[cid], 0).unwrap();
    assert_eq!(starts(&e, 0), vec![0, 100]);
    assert_eq!(starts(&e, 1), vec![0, 100]);
    e.undo();
    let cid = e.project.tracks[0]
        .clips
        .iter()
        .find(|c| c.start == 100)
        .unwrap()
        .id
        .clone();
    e.apply(Edit::Delete {
        ids: vec![cid],
        ripple: true,
    })
    .unwrap();
    assert_eq!(starts(&e, 0), vec![0, 100]);
    assert_eq!(starts(&e, 1), vec![0, 100]);
}

#[test]
fn magnetic_enable_closes_existing_leading_gaps_and_preserves_overlaps() {
    let mut e = fixture();
    e.project.tracks[0].clips[0].start = 60;
    let mut overlap = e.project.tracks[0].clips[0].clone();
    overlap.id = id();
    overlap.start = 300;
    e.project.tracks[0].clips.push(overlap);
    e.apply(Edit::SetMagneticTimeline { enabled: true })
        .unwrap();
    assert_eq!(starts(&e, 0), vec![0, 240]);
    assert_eq!(e.project.tracks[0].clips[0].duration, 300);
    e.undo();
    assert!(!e.project.magnetic_timeline);
    assert_eq!(starts(&e, 0), vec![60, 300]);
}

#[test]
fn magnetic_disabled_preserves_manual_gaps_and_splits_do_not_move_content() {
    let mut e = magnetic_fixture();
    let cid = e.project.tracks[0].clips[0].id.clone();
    e.apply(Edit::Split {
        ids: vec![cid],
        frame: 50,
    })
    .unwrap();
    assert_eq!(starts(&e, 0), vec![0, 50, 100, 200]);
    e.apply(Edit::SetMagneticTimeline { enabled: false })
        .unwrap();
    let cid = e.project.tracks[0]
        .clips
        .iter()
        .find(|c| c.start == 100)
        .unwrap()
        .id
        .clone();
    e.apply(Edit::Delete {
        ids: vec![cid],
        ripple: false,
    })
    .unwrap();
    assert_eq!(starts(&e, 0), vec![0, 50, 200]);
}

#[test]
fn magnetic_locked_linked_audio_rejects_the_entire_edit() {
    let mut e = magnetic_fixture();
    let cid = e.project.tracks[0]
        .clips
        .iter()
        .find(|c| c.start == 100)
        .unwrap()
        .id
        .clone();
    // Lock only a surviving linked partner, not the clips being deleted.
    let mut locked = e.project.tracks[1].clone();
    locked.id = id();
    locked.locked = true;
    locked.clips.retain(|c| c.start == 200);
    e.project.tracks[1].clips.retain(|c| c.start != 200);
    e.project.tracks.push(locked);
    let before = serde_json::to_value(&e.project).unwrap();
    let revision = e.revision;
    assert!(e
        .apply(Edit::Delete {
            ids: vec![cid],
            ripple: false
        })
        .is_err());
    assert_eq!(serde_json::to_value(&e.project).unwrap(), before);
    assert_eq!(e.revision, revision);
}

#[test]
fn magnetic_setting_roundtrips_and_legacy_projects_remain_nonmagnetic() {
    let e = magnetic_fixture();
    let value = serde_json::to_value(&e.project).unwrap();
    let restored: Project = serde_json::from_value(value.clone()).unwrap();
    assert!(restored.magnetic_timeline);
    let mut legacy = value;
    legacy.as_object_mut().unwrap().remove("magneticTimeline");
    let restored: Project = serde_json::from_value(legacy).unwrap();
    assert!(!restored.magnetic_timeline);
}
