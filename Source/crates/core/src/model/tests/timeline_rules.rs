use super::*;

#[test]
fn ripple_is_independent_saved_and_undoable() {
    let mut e = fixture();
    e.apply(Edit::SetAutoRipple { enabled: true }).unwrap();
    assert!(e.project.auto_ripple);
    assert!(!e.project.magnetic_timeline);
    let mut value = serde_json::to_value(&e.project).unwrap();
    assert!(
        serde_json::from_value::<Project>(value.clone())
            .unwrap()
            .auto_ripple
    );
    value.as_object_mut().unwrap().remove("autoRipple");
    assert!(
        !serde_json::from_value::<Project>(value)
            .unwrap()
            .auto_ripple
    );
    e.undo();
    assert!(!e.project.auto_ripple);
}

#[test]
fn invalid_overlap_returns_to_original_position_without_history() {
    let mut e = fixture();
    let first = e.project.tracks[0].clips[0].id.clone();
    e.apply(Edit::Split {
        ids: vec![first.clone()],
        frame: 100,
    })
    .unwrap();
    let before = e.project.clone();
    let revision = e.revision;
    assert!(e
        .apply(Edit::Move {
            ids: vec![first],
            delta: 20,
            target_track: None
        })
        .is_err());
    assert_eq!(e.project, before);
    assert_eq!(e.revision, revision);
}

#[test]
fn ripple_trim_insert_delete_and_combined_magnet_do_not_double_shift() {
    for magnetic in [false, true] {
        let mut e = magnetic_fixture();
        e.apply(Edit::SetMagneticTimeline { enabled: magnetic })
            .unwrap();
        e.apply(Edit::SetAutoRipple { enabled: true }).unwrap();
        let first = e.project.tracks[0].clips[0].id.clone();
        e.apply(Edit::Trim {
            id: first.clone(),
            edge: "right".into(),
            frame: 80,
        })
        .unwrap();
        assert_eq!(starts(&e, 0), vec![0, 80, 180]);
        assert_eq!(starts(&e, 1), vec![0, 80, 180]);
        e.apply(Edit::Delete {
            ids: vec![first],
            ripple: false,
        })
        .unwrap();
        assert_eq!(starts(&e, 0), vec![0, 100]);
        assert_eq!(starts(&e, 1), vec![0, 100]);
        let asset = e.project.assets[0].id.clone();
        let track = e.project.tracks[0].id.clone();
        e.apply(Edit::AddClip {
            media_id: asset,
            track_id: track,
            start: 0,
        })
        .unwrap();
        assert_eq!(starts(&e, 0), vec![0, 300, 400]);
        assert_eq!(starts(&e, 1), vec![300, 400]);
    }
}

#[test]
fn ripple_cannot_shift_one_half_of_a_locked_link() {
    let mut e = magnetic_fixture();
    e.apply(Edit::SetMagneticTimeline { enabled: false })
        .unwrap();
    e.apply(Edit::SetAutoRipple { enabled: true }).unwrap();
    let track = e.project.tracks[1].id.clone();
    e.apply(Edit::SetTrack {
        id: track,
        locked: Some(true),
        muted: None,
        visible: None,
    })
    .unwrap();
    let before = e.project.clone();
    let asset = e.project.assets[0].id.clone();
    let track = e.project.tracks[0].id.clone();
    assert!(e
        .apply(Edit::AddClip {
            media_id: asset,
            track_id: track,
            start: 0
        })
        .is_err());
    assert_eq!(e.project, before);
}

#[test]
fn ripple_delete_rejects_a_locked_downstream_partner() {
    let mut e = magnetic_fixture();
    e.apply(Edit::SetMagneticTimeline { enabled: false })
        .unwrap();
    e.apply(Edit::SetAutoRipple { enabled: true }).unwrap();
    let first = e.project.tracks[0].clips[0].id.clone();
    // Lock only the final audio clip's track, leaving the deleted pair unlocked.
    let last = e.project.tracks[1].clips.pop().unwrap();
    e.project.tracks.push(Track {
        id: id(),
        name: "Locked audio".into(),
        kind: "audio".into(),
        locked: true,
        muted: false,
        visible: true,
        clips: vec![last],
    });
    let before = e.project.clone();
    assert!(e
        .apply(Edit::Delete {
            ids: vec![first],
            ripple: false
        })
        .is_err());
    assert_eq!(e.project, before);
}

#[test]
fn ripple_insert_in_occupied_space_uses_nearest_edge_and_preserves_gaps() {
    let mut e = fixture();
    e.apply(Edit::SetAutoRipple { enabled: true }).unwrap();
    let track = e.project.tracks[0].id.clone();
    let asset = e.project.assets[0].id.clone();
    e.apply(Edit::AddClip {
        media_id: asset,
        track_id: track,
        start: 50,
    })
    .unwrap();
    assert_eq!(starts(&e, 0), vec![0, 300]);
}
