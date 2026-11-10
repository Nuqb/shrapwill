use super::*;
pub(super) fn fixture() -> Editor {
    let mut e = Editor::default();
    let a = MediaAsset {
        id: id(),
        path: "sample.mp4".into(),
        name: "Sample".into(),
        kind: "video".into(),
        duration: 10.,
        width: 1920,
        height: 1080,
        has_audio: true,
        preview_path: None,
        thumbnail_path: None,
        waveform: Default::default(),
        missing: false,
    };
    let mid = a.id.clone();
    e.project.assets.push(a);
    let tid = e.project.tracks[0].id.clone();
    e.apply(Edit::AddClip {
        media_id: mid,
        track_id: tid,
        start: 0,
    })
    .unwrap();
    e
}
pub(super) fn magnetic_fixture() -> Editor {
    let mut e = fixture();
    let first = e.project.tracks[0].clips[0].id.clone();
    e.apply(Edit::DetachAudio { id: first.clone() }).unwrap();
    e.apply(Edit::Split {
        ids: vec![first],
        frame: 100,
    })
    .unwrap();
    let second = e.project.tracks[0]
        .clips
        .iter()
        .find(|c| c.start == 100)
        .unwrap()
        .id
        .clone();
    e.apply(Edit::Split {
        ids: vec![second],
        frame: 200,
    })
    .unwrap();
    e.apply(Edit::SetMagneticTimeline { enabled: true })
        .unwrap();
    e
}
pub(super) fn starts(e: &Editor, track: usize) -> Vec<i64> {
    let mut starts: Vec<_> = e.project.tracks[track]
        .clips
        .iter()
        .map(|c| c.start)
        .collect();
    starts.sort();
    starts
}
