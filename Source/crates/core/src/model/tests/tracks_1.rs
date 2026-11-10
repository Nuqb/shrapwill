use super::*;

#[test]
fn track_deletion_is_atomic_undoable_and_keeps_other_lane_content() {
    let mut e = fixture();
    let video = e.project.tracks[0].id.clone();
    let cid = e.project.tracks[0].clips[0].id.clone();
    e.apply(Edit::DetachAudio { id: cid.clone() }).unwrap();
    let audio = e.project.tracks[1].id.clone();
    e.apply(Edit::AddTrack {
        kind: "video".into(),
    })
    .unwrap();
    let extra = e.project.tracks[0].id.clone();
    let revision = e.revision;
    e.apply(Edit::DeleteTracks {
        ids: vec![audio, extra],
    })
    .unwrap();
    assert_eq!(e.project.tracks.len(), 1);
    assert_eq!(e.project.tracks[0].id, video);
    assert_eq!(e.project.tracks[0].clips[0].id, cid);
    assert_eq!(e.project.tracks[0].clips[0].link, None);
    assert_eq!(e.revision, revision + 1);
    e.undo();
    assert_eq!(e.project.tracks.len(), 3);
    assert!(e.project.clip(&cid).unwrap().1.link.is_some());
    e.redo();
    assert_eq!(e.project.tracks.len(), 1);
}

#[test]
fn locked_or_missing_tracks_cannot_be_partly_deleted() {
    let mut e = fixture();
    let ids: Vec<_> = e.project.tracks.iter().map(|t| t.id.clone()).collect();
    e.project.tracks[1].locked = true;
    let before = serde_json::to_value(&e.project).unwrap();
    assert!(e.apply(Edit::DeleteTracks { ids: ids.clone() }).is_err());
    assert_eq!(serde_json::to_value(&e.project).unwrap(), before);
    assert!(e
        .apply(Edit::DeleteTracks {
            ids: vec![ids[0].clone(), "missing".into()]
        })
        .is_err());
    assert_eq!(serde_json::to_value(&e.project).unwrap(), before);
    e.project.tracks[1].locked = false;
    e.apply(Edit::DeleteTracks { ids }).unwrap();
    assert!(e.project.tracks.is_empty());
    e.undo();
    assert_eq!(e.project.tracks.len(), 2);
}

#[test]
fn deleting_main_track_does_not_retime_the_new_main_lane() {
    let mut e = magnetic_fixture();
    let old_main = e.project.tracks[0].id.clone();
    let mut overlay = e.project.tracks[0].clone();
    overlay.id = id();
    overlay.clips.truncate(1);
    overlay.clips[0].id = id();
    overlay.clips[0].start = 180;
    overlay.clips[0].link = None;
    e.project.tracks.insert(0, overlay);
    e.apply(Edit::DeleteTracks {
        ids: vec![old_main],
    })
    .unwrap();
    assert_eq!(e.project.tracks[0].clips[0].start, 180);
}
