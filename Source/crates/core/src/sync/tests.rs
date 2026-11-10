use super::*;

fn snapshot() -> Snapshot {
    Snapshot {
        project: Project::default(),
        path: None,
        dirty: false,
        revision: 0,
        can_undo: false,
        can_redo: false,
        can_paste: false,
        render: None,
        session_id: String::new(),
        sequence: 0,
    }
}
#[test]
fn saves_and_derived_media_updates_have_independent_sequences() {
    let mut state = PublishedState::default();
    let initial = snapshot();
    assert!(matches!(
        state.publish(initial.clone()),
        Update::Full { .. }
    ));
    let mut saved = initial;
    saved.path = Some("saved.cutline".into());
    let Update::Delta { delta } = state.publish(saved) else {
        panic!("expected delta")
    };
    assert_eq!((delta.base_sequence, delta.sequence), (1, 2));
    assert_eq!(delta.flags["revision"], 0);
    assert_eq!(delta.flags["path"], "saved.cutline");
    assert!(delta.assets.upsert.is_empty());
    assert!(delta.tracks.upsert.is_empty());
}
#[test]
fn reopening_the_same_project_gets_a_new_session_and_full_state() {
    let mut state = PublishedState::default();
    let initial = snapshot();
    state.publish(initial.clone());
    let previous = state.session_id.clone();
    state.reset_session();
    assert!(matches!(state.publish(initial), Update::Full { .. }));
    assert_ne!(previous, state.session_id);
    assert_eq!(state.sequence, 2);
}
#[test]
fn entity_changes_preserve_order_and_report_deletions() {
    let old = vec!["a".to_string(), "b".to_string()];
    let new = vec!["b".to_string(), "c".to_string()];
    let patch = entities(&old, &new, |s| s);
    assert_eq!(patch.removed, ["a"]);
    assert_eq!(patch.upsert, ["c"]);
    assert_eq!(patch.order.unwrap(), ["b", "c"]);
}
