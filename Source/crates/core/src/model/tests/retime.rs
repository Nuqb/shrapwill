use super::*;
#[test]
fn speed_edits_preserve_originals_and_undo_linked_timing() {
    let mut e = fixture();
    let clip = e.project.tracks[0].clips[0].id.clone();
    e.apply(Edit::DetachAudio { id: clip.clone() }).unwrap();
    let original = e.project.clone();
    let mut asset = e.project.assets[0].clone();
    asset.id = id();
    asset.duration = 5.;
    asset.path = "speed.mkv".into();
    e.apply(Edit::Retime {
        id: clip.clone(),
        asset,
        settings: None,
        ripple: true,
    })
    .unwrap();
    for c in e.project.tracks.iter().flat_map(|t| &t.clips) {
        assert_eq!(c.duration, 150);
        assert_eq!(c.source_in, 0.);
    }
    assert_eq!(e.project.assets[0], original.assets[0]);
    e.undo();
    assert_eq!(e.project, original);
    e.redo();
    assert_eq!(e.project.assets.len(), 2);
}
#[test]
fn locked_link_rejects_speed_atomically() {
    let mut e = fixture();
    let clip = e.project.tracks[0].clips[0].id.clone();
    e.apply(Edit::DetachAudio { id: clip.clone() }).unwrap();
    e.project
        .tracks
        .iter_mut()
        .find(|t| t.kind == "audio")
        .unwrap()
        .locked = true;
    let original = e.project.clone();
    let mut asset = e.project.assets[0].clone();
    asset.id = id();
    asset.duration = 5.;
    assert!(e
        .apply(Edit::Retime {
            id: clip,
            asset,
            settings: None,
            ripple: true
        })
        .is_err());
    assert_eq!(e.project, original);
}
