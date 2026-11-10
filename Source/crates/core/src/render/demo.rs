use super::{demo_photos, plan, RenderPlan};
use crate::{id, Clip, MediaAsset, Project, Properties, Transition};
use serde::Deserialize;
use std::{fs, path::Path};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DemoOptions {
    pub properties: Properties,
    pub transition_kind: Option<String>,
    #[serde(default)]
    pub sample_index: usize,
}

fn demo_image(cache: &Path, index: usize) -> Result<MediaAsset, String> {
    let (name, bytes) = demo_photos::photo(index)?;
    let directory = cache.join("preset-demo-photos-v3");
    fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    let path = directory.join(name);
    if !path.exists() {
        fs::write(&path, bytes).map_err(|e| e.to_string())?;
    }
    let path = path.to_string_lossy().into_owned();
    Ok(MediaAsset {
        id: id(),
        path: path.clone(),
        name: "Preview sample".into(),
        kind: "image".into(),
        duration: 5.,
        width: 1280,
        height: 720,
        has_audio: false,
        preview_path: Some(path),
        thumbnail_path: None,
        waveform: Default::default(),
        missing: false,
    })
}

fn sample_clip(asset: &MediaAsset, duration: i64, props: Properties) -> Clip {
    Clip {
        id: id(),
        media_id: Some(asset.id.clone()),
        name: "Preview sample".into(),
        start: 0,
        duration,
        source_in: 0.,
        link: None,
        audio_enabled: false,
        props,
        title: None,
        transition: None,
    }
}

pub fn preset_demo(
    settings: &Project,
    cache: &Path,
    options: DemoOptions,
) -> Result<RenderPlan, String> {
    if options
        .transition_kind
        .as_deref()
        .is_some_and(crate::transition_sources::unavailable)
    {
        return Err(
            "The original transition has not been ported; the earlier approximation is disabled."
                .into(),
        );
    }
    let mut project = Project {
        width: settings.width,
        height: settings.height,
        fps: settings.fps.clone(),
        ..Project::default()
    };
    let duration = project.fps.frames(if options.transition_kind.is_some() {
        2.5
    } else {
        5.
    });
    let first = demo_image(cache, options.sample_index)?;
    let clip = sample_clip(&first, duration, options.properties);
    project.assets.push(first);
    project.tracks[0].clips.push(clip);
    if let Some(kind) = options.transition_kind {
        let second = demo_image(cache, (options.sample_index + 1) % demo_photos::COUNT)?;
        let mut incoming = sample_clip(&second, duration, Properties::default());
        let frames = project.fps.frames(2.).max(1);
        incoming.start = duration - frames;
        incoming.transition = Some(Transition { kind, frames });
        project.assets.push(second);
        project.tracks[0].clips.push(incoming);
    }
    plan(&project, true)
}
