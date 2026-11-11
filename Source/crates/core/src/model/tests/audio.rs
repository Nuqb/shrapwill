use super::*;

#[test]
fn audio_defaults_roundtrip_undo_and_locked_edits() {
    let legacy: Properties = serde_json::from_str("{}").unwrap();
    assert_eq!(*legacy.audio, AudioSettings::default());
    let mut editor = fixture();
    let clip = editor.project.tracks[0].clips[0].clone();
    let mut props = clip.props.clone();
    props.audio.pitch = 4.;
    props.audio.ducking = true;
    props.audio.equalizer[3] = -2.;
    editor
        .apply(Edit::Properties {
            id: clip.id.clone(),
            props: props.clone(),
        })
        .unwrap();
    let restored: Project =
        serde_json::from_str(&serde_json::to_string(&editor.project).unwrap()).unwrap();
    assert_eq!(restored.tracks[0].clips[0].props, props);
    editor.undo();
    assert_eq!(editor.project.tracks[0].clips[0].props, clip.props);
    editor.redo();
    assert_eq!(editor.project.tracks[0].clips[0].props, props);
    editor.project.tracks[0].locked = true;
    props.audio.pitch = 3.;
    assert!(editor
        .apply(Edit::Properties { id: clip.id, props })
        .is_err());
    assert_eq!(editor.project.tracks[0].clips[0].props.audio.pitch, 4.);
}

#[test]
fn invalid_audio_rejects_the_whole_edit() {
    let mut editor = fixture();
    let clip = editor.project.tracks[0].clips[0].clone();
    let before = serde_json::to_string(&editor.project).unwrap();
    for a in [
        AudioSettings {
            pitch: f64::NAN,
            ..Default::default()
        },
        AudioSettings {
            balance: 2.,
            ..Default::default()
        },
        AudioSettings {
            channels: "file:outside".into(),
            ..Default::default()
        },
        AudioSettings {
            equalizer: [21.; 10],
            ..Default::default()
        },
        AudioSettings {
            voice_filter: "arbitrary-filter".into(),
            ..Default::default()
        },
        AudioSettings {
            duck_amount: f64::INFINITY,
            ..Default::default()
        },
        AudioSettings {
            hiss: -1.,
            ..Default::default()
        },
    ] {
        let mut props = clip.props.clone();
        props.audio = Box::new(a);
        assert!(editor
            .apply(Edit::Properties {
                id: clip.id.clone(),
                props
            })
            .is_err());
        assert_eq!(serde_json::to_string(&editor.project).unwrap(), before);
    }
}
