use cutline_core::{
    media::{self, ExportSettings},
    render, *,
};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::{atomic::AtomicBool, Arc},
};
fn main() -> Result<(), String> {
    let out = std::env::args()
        .nth(1)
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("../qa"));
    fs::create_dir_all(&out).map_err(|e| e.to_string())?;
    let out = media::clean_path(&fs::canonicalize(out).map_err(|e| e.to_string())?);
    let bin = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../src-tauri/binaries");
    let ff = bin.join("ffmpeg-x86_64-pc-windows-msvc.exe");
    let fp = bin.join("ffprobe-x86_64-pc-windows-msvc.exe");
    let cancel = Arc::new(AtomicBool::new(false));
    let red = out.join("Red café's clip.mp4");
    let blue = out.join("Blue silent.mp4");
    let image = out.join("Warm still.png");
    media::capture(
        &ff,
        &media::strings(&[
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "color=c=0xc54939:s=640x360:r=30:d=3",
            "-f",
            "lavfi",
            "-i",
            "sine=frequency=440:sample_rate=48000:duration=3",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-shortest",
            &red.to_string_lossy(),
        ]),
        &cancel,
        65536,
    )?;
    media::capture(
        &ff,
        &media::strings(&[
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "testsrc2=s=640x360:r=30:d=2",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            &blue.to_string_lossy(),
        ]),
        &cancel,
        65536,
    )?;
    media::capture(
        &ff,
        &media::strings(&[
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "color=c=0xe6c78d:s=640x360:d=1",
            "-frames:v",
            "1",
            &image.to_string_lossy(),
        ]),
        &cancel,
        65536,
    )?;
    let cache = out.join("cache");
    let mut e = Editor::new(Project {
        width: 640,
        height: 360,
        name: "Cutline validation".into(),
        ..Default::default()
    });
    for path in [&red, &blue, &image] {
        let a = media::probe(&fp, path, &cancel)?;
        let a = media::prepare(&ff, &cache, a, 360, &cancel, &|_| {})?;
        e.project.assets.push(a);
    }
    let video = e.project.tracks[0].id.clone();
    let mids = e
        .project
        .assets
        .iter()
        .map(|a| a.id.clone())
        .collect::<Vec<_>>();
    e.apply(Edit::AddClip {
        media_id: mids[0].clone(),
        track_id: video.clone(),
        start: 0,
    })?;
    let first = e.project.tracks[0].clips[0].id.clone();
    e.apply(Edit::DetachAudio { id: first.clone() })?;
    e.apply(Edit::Split {
        ids: vec![first.clone()],
        frame: 30,
    })?;
    e.apply(Edit::AddClip {
        media_id: mids[1].clone(),
        track_id: video.clone(),
        start: 90,
    })?;
    let second = e.project.tracks[0].clips.last().unwrap().id.clone();
    e.apply(Edit::SetTransition {
        id: second,
        kind: "dissolve".into(),
        frames: 15,
    })?;
    let mut props = e.project.tracks[0].clips[0].props.clone();
    props.brightness = -0.03;
    props.contrast = 1.1;
    props.saturation = 0.8;
    e.apply(Edit::Properties {
        id: first.clone(),
        props,
    })?;
    let audio = e.project.tracks[1].clips[0].id.clone();
    let props = Properties {
        gain_db: -3.,
        fade_in: 15,
        fade_out: 15,
        ..Default::default()
    };
    e.apply(Edit::Properties { id: audio, props })?;
    e.apply(Edit::AddClip {
        media_id: mids[2].clone(),
        track_id: video,
        start: 135,
    })?;
    let still = e.project.tracks[0].clips.last().unwrap().id.clone();
    e.apply(Edit::Trim {
        id: still,
        edge: "right".into(),
        frame: 165,
    })?;
    e.apply(Edit::AddTrack {
        kind: "video".into(),
    })?;
    let titletrack = e.project.tracks[0].id.clone();
    e.apply(Edit::AddTitle {
        track_id: titletrack,
        start: 15,
        style: "lower".into(),
    })?;
    let title = e.project.tracks[0].clips[0].id.clone();
    e.apply(Edit::Trim {
        id: title,
        edge: "right".into(),
        frame: 90,
    })?;
    render::prepare_titles(&mut e.project, &cache)?;
    e.project.validate()?;
    let project = out.join("Validation.cutline");
    core_save(&e.project, &project)?;
    let p: Project = serde_json::from_slice(&fs::read(&project).unwrap()).unwrap();
    p.validate()?;
    assert_eq!(p.duration(), 165);
    let settings = ExportSettings {
        width: 640,
        height: 360,
        quality: "draft".into(),
        encoder: "software".into(),
    };
    let dest = out.join("Validation.mp4");
    render::export(&ff, &p, &settings, &dest, &cache, &cancel, &|v| {
        if v > 0.99 {
            println!("render complete")
        }
    })?;
    let metadata = media::probe(&fp, &dest, &cancel)?;
    assert!(
        (metadata.duration - 5.5).abs() <= 1. / 30. + 0.003,
        "duration {}",
        metadata.duration
    );
    assert!(metadata.has_audio);
    assert_eq!(metadata.width, 640);
    let frame = media::capture(
        &ff,
        &media::strings(&[
            "-hide_banner",
            "-loglevel",
            "error",
            "-ss",
            "0.4",
            "-i",
            &dest.to_string_lossy(),
            "-frames:v",
            "1",
            "-vf",
            "scale=1:1",
            "-pix_fmt",
            "rgb24",
            "-f",
            "rawvideo",
            "pipe:1",
        ]),
        &cancel,
        64,
    )?;
    assert!(
        frame[0] > frame[1] && frame[0] > frame[2],
        "Expected red first scene, got {frame:?}"
    );
    let keep = out.join("existing.mp4");
    fs::write(&keep, b"keep this file").unwrap();
    let cancelled = Arc::new(AtomicBool::new(true));
    assert!(render::export(&ff, &p, &settings, &keep, &cache, &cancelled, &|_| {}).is_err());
    assert_eq!(fs::read(&keep).unwrap(), b"keep this file");
    assert!(media::probe(&fp, &out.join("missing.mp4"), &cancel).is_err());
    fs::write(out.join("broken.mp4"), b"not a video").unwrap();
    assert!(media::probe(&fp, &out.join("broken.mp4"), &cancel).is_err());
    fs::write(out.join("smoke-results.json"),serde_json::to_vec_pretty(&serde_json::json!({"passed":true,"duration":metadata.duration,"frames":165,"resolution":[metadata.width,metadata.height],"tests":["Unicode and apostrophe paths","video with audio","silent video","still image","proxy preparation","waveforms","linked split","trim","color LUT","lower-third rasterization","cross dissolve","audio fades","save/reopen","export duration","output picture","cancel preserves existing destination","invalid and missing media"]})).unwrap()).unwrap();
    println!(
        "PASS: media workflow, 165 frames, 5.5 seconds; {}",
        dest.display()
    );
    Ok(())
}
fn core_save(p: &Project, path: &Path) -> Result<(), String> {
    cutline_core::model::atomic_write(path, &serde_json::to_vec_pretty(p).unwrap())
}
