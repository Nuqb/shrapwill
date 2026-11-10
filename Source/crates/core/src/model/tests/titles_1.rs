use super::*;

#[test]
fn automatic_titles_reuse_one_lane_and_find_free_space() {
    let mut e = fixture();
    for style in ["plain", "lower", "plain"] {
        e.apply(Edit::AddTitle {
            track_id: String::new(),
            start: 0,
            style: style.into(),
        })
        .unwrap();
    }
    assert_eq!(e.project.tracks.len(), 3);
    assert_eq!(
        e.project.tracks[0]
            .clips
            .iter()
            .map(|c| c.start)
            .collect::<Vec<_>>(),
        vec![0, 150, 300]
    );
    let title_track = e.project.tracks[0].id.clone();
    e.undo();
    assert_eq!(e.project.tracks[0].clips.len(), 2);
    e.project.tracks[0].clips.clear();
    e.apply(Edit::AddTitle {
        track_id: String::new(),
        start: 45,
        style: "plain".into(),
    })
    .unwrap();
    assert_eq!(e.project.tracks[0].id, title_track);
    assert_eq!(e.project.tracks.len(), 3);
    assert_eq!(e.project.tracks[0].clips[0].start, 45);
}

#[test]
fn title_drop_honors_explicit_lane_and_locks() {
    let mut e = fixture();
    e.apply(Edit::AddTrack {
        kind: "video".into(),
    })
    .unwrap();
    let track_id = e.project.tracks[0].id.clone();
    e.apply(Edit::AddTitle {
        track_id: track_id.clone(),
        start: 75,
        style: "lower".into(),
    })
    .unwrap();
    assert_eq!(e.project.tracks.len(), 3);
    assert_eq!(e.project.tracks[0].clips[0].start, 75);
    e.project.tracks[0].locked = true;
    assert!(e
        .apply(Edit::AddTitle {
            track_id,
            start: 0,
            style: "plain".into()
        })
        .is_err());
    e.apply(Edit::AddTitle {
        track_id: String::new(),
        start: 0,
        style: "plain".into(),
    })
    .unwrap();
    assert_eq!(e.project.tracks.len(), 4);
    e.apply(Edit::AddTitle {
        track_id: String::new(),
        start: 0,
        style: "plain".into(),
    })
    .unwrap();
    assert_eq!(e.project.tracks.len(), 4);
}
