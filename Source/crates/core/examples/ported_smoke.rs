use cutline_core::{media, render, *};
use std::{
    fs,
    path::PathBuf,
    sync::{atomic::AtomicBool, Arc},
};

fn main() -> Result<(), String> {
    let directory = PathBuf::from(
        std::env::args()
            .nth(1)
            .unwrap_or("../QA/ported-literal".into()),
    );
    fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    let directory = media::clean_path(&fs::canonicalize(directory).map_err(|e| e.to_string())?);
    let kind = std::env::args().nth(2).unwrap_or("warp_zoom_3".into());
    let dimension = |index, fallback| {
        std::env::args().nth(index).map_or(Ok(fallback), |value| {
            value.parse::<u32>().map_err(|error| error.to_string())
        })
    };
    let mut project = Project {
        width: dimension(3, 320)?,
        height: dimension(4, 180)?,
        ..Default::default()
    };
    let mut properties = Properties::default();
    let mut transition_kind = Some(kind.clone());
    if kind.starts_with("filmora_") {
        let entries: serde_json::Value = serde_json::from_str(include_str!(
            "../../../src/features/preview/ported/effects-manifest.json"
        ))
        .unwrap();
        let entry = entries
            .as_array()
            .unwrap()
            .iter()
            .find(|e| e["kind"] == kind)
            .ok_or("Unknown original preset")?;
        if entry["family"] == "filter" {
            properties.original_filter = kind.clone();
        } else {
            properties.original_effect = kind.clone();
        }
        transition_kind = None;
    }
    let plan = render::preset_demo(
        &project,
        &directory,
        render::DemoOptions {
            sample_index: 0,
            properties,
            transition_kind,
        },
    )?;
    for rc in plan.clips {
        project.assets.push(MediaAsset {
            id: rc.clip.media_id.clone().unwrap(),
            path: rc.source.clone(),
            name: rc.clip.name.clone(),
            kind: "image".into(),
            duration: 5.,
            width: rc.width,
            height: rc.height,
            has_audio: false,
            preview_path: Some(rc.source),
            thumbnail_path: None,
            waveform: vec![],
            missing: false,
        });
        project.tracks[0].clips.push(rc.clip);
    }
    let ffmpeg = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe");
    let settings = media::ExportSettings {
        width: project.width,
        height: project.height,
        quality: "high".into(),
        encoder: "software".into(),
    };
    render::export(
        &ffmpeg,
        &project,
        &settings,
        &directory.join(format!("{kind}.mp4")),
        &directory,
        &Arc::new(AtomicBool::new(false)),
        &|_| {},
    )?;
    fs::write(
        directory.join(format!("{kind}.cutline")),
        serde_json::to_vec_pretty(&project).unwrap(),
    )
    .map_err(|e| e.to_string())?;
    println!("Exported original shader {kind}");
    Ok(())
}
