use super::*;

#[test]
fn rational_timing() {
    let f = FrameRate {
        num: 30000,
        den: 1001,
    };
    assert_eq!(f.frames(f.seconds(18000)), 18000);
}

#[test]
fn split_preserves_source() {
    let mut e = fixture();
    let cid = e.project.tracks[0].clips[0].id.clone();
    e.apply(Edit::Split {
        ids: vec![cid],
        frame: 90,
    })
    .unwrap();
    let c = &e.project.tracks[0].clips;
    assert_eq!(c[0].duration, 90);
    assert_eq!(c[1].duration, 210);
    assert_eq!(c[1].source_in, 3.);
    e.undo();
    assert_eq!(e.project.tracks[0].clips.len(), 1);
    e.redo();
    assert_eq!(e.project.tracks[0].clips.len(), 2);
}

#[test]
fn trim_clamps_to_source() {
    let mut e = fixture();
    let cid = e.project.tracks[0].clips[0].id.clone();
    e.apply(Edit::Trim {
        id: cid.clone(),
        edge: "right".into(),
        frame: 1000,
    })
    .unwrap();
    assert_eq!(e.project.tracks[0].clips[0].duration, 300);
    e.apply(Edit::Trim {
        id: cid,
        edge: "left".into(),
        frame: 60,
    })
    .unwrap();
    assert_eq!(e.project.tracks[0].clips[0].source_in, 2.);
    assert_eq!(e.project.tracks[0].clips[0].duration, 240);
}

#[test]
fn linked_split_and_lock() {
    let mut e = fixture();
    let cid = e.project.tracks[0].clips[0].id.clone();
    e.apply(Edit::DetachAudio { id: cid.clone() }).unwrap();
    e.apply(Edit::Split {
        ids: vec![cid.clone()],
        frame: 120,
    })
    .unwrap();
    assert_eq!(e.project.tracks[0].clips.len(), 2);
    assert_eq!(e.project.tracks[1].clips.len(), 2);
    assert_eq!(
        e.project.tracks[0].clips[1].link,
        e.project.tracks[1].clips[1].link
    );
    e.project.tracks[1].locked = true;
    assert!(e
        .apply(Edit::Move {
            ids: vec![cid],
            delta: 10,
            target_track: None
        })
        .is_err());
}

#[test]
fn ripple_deduplicates_linked_spans() {
    let mut e = fixture();
    let cid = e.project.tracks[0].clips[0].id.clone();
    e.apply(Edit::DetachAudio { id: cid.clone() }).unwrap();
    let mut next = e.project.tracks[0].clips[0].clone();
    next.id = id();
    next.link = None;
    next.start = 300;
    e.project.tracks[0].clips.push(next);
    e.apply(Edit::Delete {
        ids: vec![cid],
        ripple: true,
    })
    .unwrap();
    assert_eq!(e.project.tracks[0].clips[0].start, 0);
    assert!(e.project.tracks[1].clips.is_empty());
}

#[test]
fn invalid_edit_is_transactional() {
    let mut e = fixture();
    let before = e.project.tracks[0].clips[0].props.scale;
    let cid = e.project.tracks[0].clips[0].id.clone();
    let props = Properties {
        scale: -1.,
        ..Properties::default()
    };
    assert!(e.apply(Edit::Properties { id: cid, props }).is_err());
    assert_eq!(e.project.tracks[0].clips[0].props.scale, before);
}

#[test]
fn serialization_roundtrip() {
    let e = fixture();
    let s = serde_json::to_string(&e.project).unwrap();
    let p: Project = serde_json::from_str(&s).unwrap();
    p.validate().unwrap();
    assert_eq!(p.duration(), 300);
}

#[test]
fn atomic_save_replaces_existing() {
    let dir = std::env::temp_dir().join(id());
    fs::create_dir_all(&dir).unwrap();
    let p = dir.join("project.cutline");
    atomic_write(&p, b"first").unwrap();
    atomic_write(&p, b"second").unwrap();
    assert_eq!(fs::read(&p).unwrap(), b"second");
    fs::remove_dir_all(dir).unwrap();
}
