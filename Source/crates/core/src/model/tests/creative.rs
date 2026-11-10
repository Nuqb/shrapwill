use super::*;

const REVEALS: &[&str] = &[
    "fade",
    "dissolve",
    "wipe_left",
    "wipe_right",
    "wipe_up",
    "wipe_down",
    "iris_open",
    "iris_close",
    "blinds",
    "checker",
];

fn incoming_clip(e: &Editor) -> String {
    e.project.tracks[0]
        .clips
        .iter()
        .find(|c| c.start == 100)
        .unwrap()
        .id
        .clone()
}

#[test]
fn unfinished_originals_reject_new_edits_but_legacy_projects_remain_readable() {
    let mut editor = magnetic_fixture();
    let incoming = incoming_clip(&editor);
    let before = serde_json::to_value(&editor.project).unwrap();
    assert!(editor
        .apply(Edit::SetTransition {
            id: incoming.clone(),
            kind: "local_flip_up".into(),
            frames: 15,
        })
        .is_err());
    assert_eq!(serde_json::to_value(&editor.project).unwrap(), before);
    editor.project.tracks[0]
        .clips
        .iter_mut()
        .find(|clip| clip.id == incoming)
        .unwrap()
        .transition = Some(Transition {
        kind: "local_flip_up".into(),
        frames: 15,
    });
    let saved = serde_json::to_string(&editor.project).unwrap();
    let restored: Project = serde_json::from_str(&saved).unwrap();
    assert!(super::super::validation::validate(&restored).is_ok());
}

#[test]
fn reveals_keep_linked_audio_aligned_and_undo_as_one_edit() {
    let kinds = REVEALS
        .iter()
        .copied()
        .chain(crate::creative::reveals().iter().map(|d| d.kind.as_str()))
        .chain(crate::creative::motions().iter().map(|d| d.kind.as_str()))
        .filter(|kind| !crate::transition_sources::unavailable(kind));
    for kind in kinds {
        let mut e = magnetic_fixture();
        let incoming = incoming_clip(&e);
        let before = serde_json::to_value(&e.project).unwrap();
        e.apply(Edit::SetTransition {
            id: incoming.clone(),
            kind: kind.into(),
            frames: 15,
        })
        .unwrap();
        let clip = e.project.clip(&incoming).unwrap().1;
        assert_eq!(clip.start, 85);
        assert_eq!(clip.source_in, 100. / 30.);
        let linked = e.project.tracks[1]
            .clips
            .iter()
            .find(|c| c.link == clip.link)
            .unwrap();
        assert_eq!(linked.start, 85);
        e.undo();
        assert_eq!(serde_json::to_value(&e.project).unwrap(), before);
        e.project.tracks[1].locked = true;
        let locked = serde_json::to_value(&e.project).unwrap();
        assert!(e
            .apply(Edit::SetTransition {
                id: incoming,
                kind: kind.into(),
                frames: 15
            })
            .is_err());
        assert_eq!(serde_json::to_value(&e.project).unwrap(), locked);
    }
}

#[test]
fn transition_duration_clamps_without_losing_predecessor_on_reapply() {
    let mut e = magnetic_fixture();
    let incoming = incoming_clip(&e);
    for kind in ["wipe_right", "iris_open"] {
        e.apply(Edit::SetTransition {
            id: incoming.clone(),
            kind: kind.into(),
            frames: 300,
        })
        .unwrap();
        let clip = e.project.clip(&incoming).unwrap().1;
        assert_eq!(clip.start, 1);
        assert_eq!(clip.transition.as_ref().unwrap().frames, 99);
    }
    let before = serde_json::to_value(&e.project).unwrap();
    assert!(e
        .apply(Edit::SetTransition {
            id: incoming,
            kind: "unknown".into(),
            frames: 15
        })
        .is_err());
    assert_eq!(serde_json::to_value(&e.project).unwrap(), before);
}

#[test]
fn old_properties_default_new_effects_and_invalid_effects_are_atomic() {
    let props: Properties = serde_json::from_str(r#"{"brightness":0.1,"saturation":0.8}"#).unwrap();
    assert_eq!(props.warmth, 0.);
    assert_eq!(props.tint, 0.);
    assert_eq!(props.sepia, 0.);
    assert_eq!(props.invert, 0.);
    assert_eq!(props.posterize, 0.);
    let mut e = fixture();
    let id = e.project.tracks[0].clips[0].id.clone();
    let before = serde_json::to_value(&e.project).unwrap();
    for props in [
        Properties {
            warmth: 2.,
            ..Default::default()
        },
        Properties {
            sepia: f64::NAN,
            ..Default::default()
        },
        Properties {
            posterize: 1.,
            ..Default::default()
        },
    ] {
        assert!(e
            .apply(Edit::Properties {
                id: id.clone(),
                props
            })
            .is_err());
        assert_eq!(serde_json::to_value(&e.project).unwrap(), before);
    }
}
