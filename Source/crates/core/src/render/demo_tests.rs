const TRANSITIONS: [&str; 10] = [
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
use super::*;
use crate::{FrameRate, Properties};

#[test]
fn samples_use_real_properties_and_preserve_the_project() {
    let cache = std::env::temp_dir().join(format!("shrapwill-demo-{}", id()));
    let project = Project {
        width: 1080,
        height: 1920,
        fps: FrameRate {
            num: 30000,
            den: 1001,
        },
        ..Default::default()
    };
    let before = serde_json::to_value(&project).unwrap();
    let props = Properties {
        sepia: 1.,
        rgb_split: 0.012,
        shake: 0.025,
        ..Default::default()
    };
    let result = preset_demo(
        &project,
        &cache,
        DemoOptions {
            sample_index: 0,
            properties: props,
            transition_kind: None,
        },
    )
    .unwrap();
    assert_eq!((result.width, result.height), (1080, 1920));
    assert_eq!(result.duration, project.fps.frames(5.));
    assert_eq!(result.fps, project.fps);
    assert_eq!(result.clips.len(), 1);
    assert!(result.clips[0].preview_ready);
    assert!(!result.clips[0].audible);
    assert!(Path::new(&result.clips[0].source).is_file());
    assert_eq!(result.clips[0].clip.props.sepia, 1.);
    assert_eq!(result.clips[0].clip.props.rgb_split, 0.012);
    assert_eq!(serde_json::to_value(&project).unwrap(), before);
    fs::remove_dir_all(cache).unwrap();
}

#[test]
fn all_transitions_have_two_overlapping_samples_and_bounded_images() {
    let cache = std::env::temp_dir().join(format!("shrapwill-demo-{}", id()));
    let project = Project::default();
    for kind in TRANSITIONS {
        let result = preset_demo(
            &project,
            &cache,
            DemoOptions {
                sample_index: 0,
                properties: Properties::default(),
                transition_kind: Some(kind.into()),
            },
        )
        .unwrap();
        assert_eq!(result.clips.len(), 2);
        assert_eq!(result.clips[0].clip.start, 0);
        assert_eq!(result.clips[1].clip.start, 15);
        assert_eq!(result.duration, 90);
        assert_eq!(result.clips[1].clip.transition.as_ref().unwrap().kind, kind);
        assert!(result
            .clips
            .iter()
            .all(|c| c.width == 1280 && c.height == 720));
    }
    assert_eq!(
        fs::read_dir(cache.join("preset-demo-photos-v3"))
            .unwrap()
            .count(),
        2
    );
    let invalid = preset_demo(
        &project,
        &cache,
        DemoOptions {
            sample_index: 0,
            properties: Properties::default(),
            transition_kind: Some("unknown".into()),
        },
    );
    assert!(invalid.is_err());
    fs::remove_dir_all(cache).unwrap();
}
