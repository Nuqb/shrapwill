use super::*;

#[test]
fn clipboard_preserves_links_but_gives_pasted_clips_new_identity() {
    let mut e = fixture();
    let cid = e.project.tracks[0].clips[0].id.clone();
    e.apply(Edit::DetachAudio { id: cid.clone() }).unwrap();
    let old_link = e.project.tracks[0].clips[0].link.clone();
    e.copy_clips(std::slice::from_ref(&cid)).unwrap();
    let ids = e.paste_clips(360).unwrap();
    assert_eq!(ids.len(), 2);
    assert_ne!(e.project.tracks[0].clips[1].id, cid);
    assert_eq!(e.project.tracks[0].clips[1].start, 360);
    assert_eq!(
        e.project.tracks[0].clips[1].link,
        e.project.tracks[1].clips[1].link
    );
    assert_ne!(e.project.tracks[0].clips[1].link, old_link);
    e.undo();
    assert_eq!(e.project.tracks[0].clips.len(), 1);
}

#[test]
fn cut_and_locked_paste_are_transactional() {
    let mut e = fixture();
    let cid = e.project.tracks[0].clips[0].id.clone();
    e.clipboard_action("cut", &[cid], 0).unwrap();
    assert!(e.project.tracks[0].clips.is_empty());
    e.project.tracks[0].locked = true;
    assert!(e.paste_clips(60).is_err());
    assert!(e.project.tracks[0].clips.is_empty());
    e.project.tracks[0].locked = false;
    e.paste_clips(60).unwrap();
    assert_eq!(e.project.tracks[0].clips[0].start, 60);
}
