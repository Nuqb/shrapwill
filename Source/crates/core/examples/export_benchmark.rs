//! Repeatable local export timings using generated media, never personal recordings.
use cutline_core::{
    media::{self, ExportSettings},
    render, Clip, FrameRate, Project, Properties,
};
use serde_json::json;
use std::{
    fs,
    path::{Path, PathBuf},
    sync::{atomic::AtomicBool, Arc},
    time::Instant,
};

fn tools() -> (PathBuf, PathBuf) {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../src-tauri/binaries");
    (
        root.join("ffmpeg-x86_64-pc-windows-msvc.exe"),
        root.join("ffprobe-x86_64-pc-windows-msvc.exe"),
    )
}
fn fixture(ffmpeg: &Path, source: &Path) -> Result<(), String> {
    if source.is_file() {
        return Ok(());
    }
    media::capture(
        ffmpeg,
        &media::strings(&[
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "testsrc2=s=1280x720:r=30:d=20",
            "-f",
            "lavfi",
            "-i",
            "sine=frequency=440:sample_rate=48000:duration=20",
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-crf",
            "18",
            "-threads",
            "2",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-shortest",
            &source.to_string_lossy(),
        ]),
        &Arc::new(AtomicBool::new(false)),
        65536,
    )?;
    Ok(())
}
fn project(asset: cutline_core::MediaAsset, count: i64, props: Properties) -> Project {
    let duration = 600 / count;
    let mut p = Project {
        width: 1280,
        height: 720,
        fps: FrameRate { num: 30, den: 1 },
        ..Default::default()
    };
    p.tracks[0].clips = (0..count)
        .map(|i| Clip {
            id: format!("clip-{i}"),
            media_id: Some(asset.id.clone()),
            name: "Generated sample".into(),
            start: i * duration,
            duration,
            source_in: i as f64 * duration as f64 / 30.,
            link: None,
            audio_enabled: true,
            props: props.clone(),
            title: None,
            transition: None,
        })
        .collect();
    p.assets.push(asset);
    p
}
fn measure(
    paths: (&Path, &Path, &Path),
    p: &Project,
    label: &str,
) -> Result<serde_json::Value, String> {
    let (ffmpeg, ffprobe, directory) = paths;
    let output = directory.join(format!("{label}.mp4"));
    let settings = ExportSettings {
        width: 1280,
        height: 720,
        quality: "high".into(),
        encoder: "software".into(),
    };
    let started = Instant::now();
    render::export(
        ffmpeg,
        p,
        &settings,
        &output,
        &directory.join("cache"),
        &Arc::new(AtomicBool::new(false)),
        &|_| {},
    )?;
    let elapsed = started.elapsed().as_secs_f64();
    let asset = media::probe(ffprobe, &output, &Arc::new(AtomicBool::new(false)))?;
    let expected = p.fps.seconds(p.duration());
    if (asset.duration - expected).abs() > 0.1 || !asset.has_audio {
        return Err("Benchmark output failed duration/audio verification".into());
    }
    println!(
        "{label}: {elapsed:.3}s for {expected:.1}s video ({:.2} fps)",
        p.duration() as f64 / elapsed
    );
    Ok(
        json!({ "scenario": label, "seconds": elapsed, "videoSeconds": expected, "framesPerSecond": p.duration() as f64/elapsed, "width": asset.width, "height": asset.height, "audio": asset.has_audio }),
    )
}
fn main() -> Result<(), String> {
    let directory = PathBuf::from(
        std::env::args()
            .nth(1)
            .ok_or("Usage: export_benchmark OUTPUT_DIRECTORY")?,
    );
    fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    let directory = fs::canonicalize(directory).map_err(|e| e.to_string())?;
    let (ffmpeg, ffprobe) = tools();
    let source = directory
        .parent()
        .unwrap_or(&directory)
        .join("export-benchmark-source.mp4");
    fixture(&ffmpeg, &source)?;
    let asset = media::probe(&ffprobe, &source, &Arc::new(AtomicBool::new(false)))?;
    let paths = (ffmpeg.as_path(), ffprobe.as_path(), directory.as_path());
    let scenarios = [
        (
            "plain-20s",
            project(asset.clone(), 1, Properties::default()),
        ),
        (
            "ten-cuts-20s",
            project(asset.clone(), 10, Properties::default()),
        ),
        (
            "graded-20s",
            project(
                asset,
                1,
                Properties {
                    warmth: 0.4,
                    contrast: 1.1,
                    brightness: 0.03,
                    ..Default::default()
                },
            ),
        ),
    ];
    let results = scenarios
        .iter()
        .map(|(name, p)| measure(paths, p, name))
        .collect::<Result<Vec<_>, _>>()?;
    fs::write(
        directory.join("results.json"),
        serde_json::to_vec_pretty(&results).unwrap(),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
