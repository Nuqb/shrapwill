use super::*;
use std::sync::Arc;

#[test]
fn edits_and_history_share_immutable_waveforms_and_preserve_serialization() {
    let mut editor = fixture();
    editor.past.clear();
    editor.project.assets[0].waveform = vec![0.1, 0.5, 0.9].into();
    let waveform = editor.project.assets[0].waveform.clone();
    let before = serde_json::to_value(&editor.project).unwrap();
    editor
        .apply(Edit::Rename {
            name: "Renamed".into(),
        })
        .unwrap();
    assert!(Arc::ptr_eq(&waveform, &editor.project.assets[0].waveform));
    assert!(Arc::ptr_eq(&waveform, &editor.past[0].assets[0].waveform));
    editor.undo();
    assert_eq!(serde_json::to_value(&editor.project).unwrap(), before);
    editor.redo();
    assert!(Arc::ptr_eq(&waveform, &editor.project.assets[0].waveform));
    assert_eq!(
        before["assets"][0]["waveform"],
        serde_json::json!([0.1f32, 0.5f32, 0.9f32])
    );
}

#[test]
fn history_still_retains_at_most_one_hundred_edits() {
    let mut editor = fixture();
    for i in 0..120 {
        editor
            .apply(Edit::Rename {
                name: i.to_string(),
            })
            .unwrap();
    }
    assert_eq!(editor.past.len(), 100);
    let revision = editor.revision;
    editor.project.tracks[0].locked = true;
    assert!(editor
        .apply(Edit::Move {
            ids: vec![editor.project.tracks[0].clips[0].id.clone()],
            delta: 1,
            target_track: None
        })
        .is_err());
    assert_eq!(editor.revision, revision);
    assert_eq!(editor.past.len(), 100);
}
