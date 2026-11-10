use super::*;
use crate::{MediaAsset, Properties};

#[test]
fn original_processing_bounds_use_source_dimensions_and_layer_count() {
    let clip = Clip {
        id: "clip".into(),
        media_id: Some("media".into()),
        name: "Generated fixture".into(),
        start: 0,
        duration: 60,
        source_in: 0.,
        link: None,
        audio_enabled: false,
        title: None,
        transition: None,
        props: Properties {
            original_filter: "filmora_1977_e9d923cf".into(),
            ..Default::default()
        },
    };
    let mut project = Project::default();
    project.assets.push(MediaAsset {
        id: "media".into(),
        path: "generated-fixture.mp4".into(),
        name: "Generated fixture".into(),
        kind: "video".into(),
        duration: 2.,
        width: 3840,
        height: 2160,
        has_audio: false,
        preview_path: None,
        thumbnail_path: None,
        waveform: vec![],
        missing: false,
    });
    project.tracks[0].clips.push(clip.clone());
    let settings = ExportSettings {
        width: 640,
        height: 360,
        quality: "high".into(),
        encoder: "software".into(),
    };
    let mut points = vec![];
    ported_export::add_boundaries(&mut points, &clip, &project, &settings);
    assert_eq!(points.first(), Some(&2));
    assert_eq!(points.last(), Some(&58));
    assert!(points.windows(2).all(|window| window[1] - window[0] <= 2));
    let mut overlay = project.tracks[0].clone();
    overlay.id = "overlay".into();
    overlay.clips[0].id = "overlay-clip".into();
    project.tracks.push(overlay);
    points.clear();
    ported_export::add_boundaries(&mut points, &clip, &project, &settings);
    assert_eq!(points.len(), 59);
    assert!(points.windows(2).all(|window| window[1] - window[0] == 1));
}
