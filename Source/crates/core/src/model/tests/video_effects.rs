use super::*;

#[test]
fn unavailable_originals_remain_readable_without_allowing_new_selections() {
    let entries: serde_json::Value = serde_json::from_str(include_str!(
        "../../../../../src/features/preview/ported/effects-manifest.json"
    ))
    .unwrap();
    let pending = entries
        .as_array()
        .unwrap()
        .iter()
        .find(|entry| entry["status"] == "requires-host-random-semantics")
        .unwrap()["kind"]
        .as_str()
        .unwrap()
        .to_string();
    let mut editor = fixture();
    let clip = editor.project.tracks[0].clips[0].clone();
    let mut props = clip.props.clone();
    props.original_effect = pending;
    assert!(editor
        .apply(Edit::Properties {
            id: clip.id.clone(),
            props: props.clone()
        })
        .is_err());
    editor.project.tracks[0].clips[0].props = props.clone();
    assert!(editor.project.validate().is_ok());
    props.brightness = 0.1;
    editor
        .apply(Edit::Properties {
            id: clip.id.clone(),
            props: props.clone(),
        })
        .unwrap();
    props.original_effect.clear();
    editor
        .apply(Edit::Properties { id: clip.id, props })
        .unwrap();
    assert_eq!(editor.project.tracks[0].clips[0].props.original_effect, "");
}

#[test]
fn original_presets_roundtrip_undo_and_reject_untrusted_identifiers() {
    let entries: serde_json::Value = serde_json::from_str(include_str!(
        "../../../../../src/features/preview/ported/effects-manifest.json"
    ))
    .unwrap();
    let kind = |family: &str| {
        entries
            .as_array()
            .unwrap()
            .iter()
            .find(|entry| entry["family"] == family && entry["status"] == "shader")
            .unwrap()["kind"]
            .as_str()
            .unwrap()
            .to_string()
    };
    let mut editor = fixture();
    let clip = editor.project.tracks[0].clips[0].clone();
    let mut props = clip.props.clone();
    props.original_filter = kind("filter");
    props.original_effect = kind("effect");
    editor
        .apply(Edit::Properties {
            id: clip.id.clone(),
            props: props.clone(),
        })
        .unwrap();
    let restored: Project =
        serde_json::from_str(&serde_json::to_string(&editor.project).unwrap()).unwrap();
    assert_eq!(
        restored.tracks[0].clips[0].props.original_filter,
        props.original_filter
    );
    assert_eq!(
        restored.tracks[0].clips[0].props.original_effect,
        props.original_effect
    );
    let before = serde_json::to_value(&editor.project).unwrap();
    props.original_effect = "../../outside-shader.frag".into();
    assert!(editor
        .apply(Edit::Properties {
            id: clip.id.clone(),
            props
        })
        .is_err());
    assert_eq!(serde_json::to_value(&editor.project).unwrap(), before);
    editor.undo();
    assert_eq!(editor.project.tracks[0].clips[0].props.original_filter, "");
    assert_eq!(editor.project.tracks[0].clips[0].props.original_effect, "");
}

#[test]
fn legacy_projects_have_no_spatial_effects() {
    let props: Properties = serde_json::from_str(r#"{"brightness":0.2}"#).unwrap();
    assert_eq!(
        (props.mosaic, props.rgb_split, props.shake, props.mirror),
        (0., 0., 0., 0.)
    );
    assert_eq!((props.wave, props.vignette, props.scanlines), (0., 0., 0.));
    assert_eq!((props.effect_style, props.effect_amount), (0, 0.));
    assert_eq!((props.filter_strength, props.effect_strength), (1., 1.));
}

#[test]
fn strengths_roundtrip_undo_and_reject_invalid_values() {
    let mut editor = fixture();
    let clip = editor.project.tracks[0].clips[0].clone();
    let mut props = clip.props.clone();
    props.filter_strength = 0.35;
    props.effect_strength = 0.6;
    editor
        .apply(Edit::Properties {
            id: clip.id.clone(),
            props: props.clone(),
        })
        .unwrap();
    let restored: Project =
        serde_json::from_str(&serde_json::to_string(&editor.project).unwrap()).unwrap();
    assert_eq!(restored.tracks[0].clips[0].props.filter_strength, 0.35);
    assert_eq!(restored.tracks[0].clips[0].props.effect_strength, 0.6);
    for value in [-0.01, 1.01, f64::NAN, f64::INFINITY] {
        let mut invalid = props.clone();
        invalid.effect_strength = value;
        assert!(editor
            .apply(Edit::Properties {
                id: clip.id.clone(),
                props: invalid
            })
            .is_err());
        let mut invalid = props.clone();
        invalid.filter_strength = value;
        assert!(editor
            .apply(Edit::Properties {
                id: clip.id.clone(),
                props: invalid
            })
            .is_err());
    }
    editor.undo();
    assert_eq!(editor.project.tracks[0].clips[0].props.effect_strength, 1.);
    assert_eq!(editor.project.tracks[0].clips[0].props.filter_strength, 1.);
}

#[test]
fn effects_roundtrip_and_undo_without_touching_color_or_timing() {
    let mut e = fixture();
    let before = serde_json::to_value(&e.project).unwrap();
    let id = e.project.tracks[0].clips[0].id.clone();
    let props = Properties {
        mosaic: 0.035,
        rgb_split: 0.012,
        shake: 0.018,
        mirror: 1.,
        wave: 0.02,
        vignette: 0.4,
        scanlines: 0.3,
        effect_style: 9,
        effect_amount: 0.6,
        brightness: 0.2,
        ..Default::default()
    };
    e.apply(Edit::Properties {
        id: id.clone(),
        props,
    })
    .unwrap();
    let encoded = serde_json::to_string(&e.project).unwrap();
    let decoded: Project = serde_json::from_str(&encoded).unwrap();
    let clip = decoded.clip(&id).unwrap().1;
    assert_eq!(clip.start, 0);
    assert_eq!(clip.duration, 300);
    assert_eq!(clip.props.brightness, 0.2);
    assert_eq!(clip.props.mosaic, 0.035);
    assert_eq!(
        (clip.props.effect_style, clip.props.effect_amount),
        (9, 0.6)
    );
    assert_eq!(clip.props.rgb_split, 0.012);
    assert_eq!(clip.props.shake, 0.018);
    assert_eq!(clip.props.mirror, 1.);
    assert_eq!(
        (clip.props.wave, clip.props.vignette, clip.props.scanlines),
        (0.02, 0.4, 0.3)
    );
    e.undo();
    assert_eq!(serde_json::to_value(&e.project).unwrap(), before);
}

#[test]
fn invalid_and_locked_effect_edits_are_atomic() {
    let mut e = fixture();
    let id = e.project.tracks[0].clips[0].id.clone();
    let before = serde_json::to_value(&e.project).unwrap();
    let invalid = [
        Properties {
            effect_style: 11,
            ..Default::default()
        },
        Properties {
            effect_amount: f64::NAN,
            ..Default::default()
        },
        Properties {
            effect_amount: 1.1,
            ..Default::default()
        },
        Properties {
            wave: 0.2,
            ..Default::default()
        },
        Properties {
            vignette: f64::NAN,
            ..Default::default()
        },
        Properties {
            scanlines: 1.1,
            ..Default::default()
        },
        Properties {
            mosaic: -0.1,
            ..Default::default()
        },
        Properties {
            mosaic: 0.3,
            ..Default::default()
        },
        Properties {
            rgb_split: f64::NAN,
            ..Default::default()
        },
        Properties {
            rgb_split: 0.2,
            ..Default::default()
        },
        Properties {
            shake: 0.2,
            ..Default::default()
        },
        Properties {
            mirror: 0.5,
            ..Default::default()
        },
    ];
    for props in invalid {
        assert!(e
            .apply(Edit::Properties {
                id: id.clone(),
                props
            })
            .is_err());
        assert_eq!(serde_json::to_value(&e.project).unwrap(), before);
    }
}

#[test]
fn locked_effect_edits_are_atomic() {
    let mut e = fixture();
    let id = e.project.tracks[0].clips[0].id.clone();
    e.project.tracks[0].locked = true;
    let before = serde_json::to_value(&e.project).unwrap();
    let props = Properties {
        shake: 0.02,
        ..Default::default()
    };
    assert!(e.apply(Edit::Properties { id, props }).is_err());
    assert_eq!(serde_json::to_value(&e.project).unwrap(), before);
}
