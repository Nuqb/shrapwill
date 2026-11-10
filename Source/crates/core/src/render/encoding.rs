//! Bounded FFmpeg threading and codec arguments shared by export intervals.
use super::plan::RenderClip;
use crate::{
    media::{self, ExportSettings},
    Project,
};
use std::path::Path;

fn budget(cap: usize) -> String {
    let available = std::thread::available_parallelism().map_or(2, usize::from);
    (available / 2).clamp(1, cap).to_string()
}
pub(super) fn input_args(active: &[&RenderClip], start: i64, end: i64, p: &Project) -> Vec<String> {
    let mut args = media::strings(&[
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-filter_complex_threads",
        &budget(4),
    ]);
    for rc in active {
        let local = p.fps.seconds(start - rc.clip.start);
        let image = rc.clip.title.is_some()
            || rc
                .clip
                .media_id
                .as_ref()
                .and_then(|id| p.assets.iter().find(|a| &a.id == id))
                .is_some_and(|a| a.kind == "image");
        args.extend(media::strings(&["-threads", "2"]));
        if image {
            args.extend(media::strings(&[
                "-loop",
                "1",
                "-framerate",
                &format!("{}/{}", p.fps.num, p.fps.den),
            ]));
        } else {
            args.extend(media::strings(&[
                "-ss",
                &(rc.clip.source_in + local).to_string(),
            ]));
        }
        args.extend(media::strings(&[
            "-t",
            &p.fps.seconds(end - start).to_string(),
            "-i",
            &rc.source,
        ]));
    }
    args
}
pub(super) fn output_args(
    settings: &ExportSettings,
    script: &Path,
    segment: &Path,
    duration: f64,
) -> Vec<String> {
    let codec = if settings.encoder == "software" {
        "libx264"
    } else {
        &settings.encoder
    };
    let mut args = media::strings(&[
        "-filter_complex_script",
        &script.to_string_lossy(),
        "-map",
        "[vout]",
        "-map",
        "[aout]",
        "-c:v",
        codec,
    ]);
    let (crf, preset) = match settings.quality.as_str() {
        "draft" => (25, "veryfast"),
        "high" => (17, "medium"),
        _ => (21, "fast"),
    };
    if settings.encoder == "software" {
        args.extend(media::strings(&[
            "-crf",
            &crf.to_string(),
            "-preset",
            preset,
            "-threads",
            &budget(8),
        ]));
    } else {
        args.extend(media::strings(&["-b:v", "12M"]));
    }
    args.extend(media::strings(&[
        "-c:a",
        "pcm_s16le",
        "-t",
        &duration.to_string(),
        "-progress",
        "pipe:1",
        "-nostats",
        &segment.to_string_lossy(),
    ]));
    args
}
