use super::{
    color, encoding, gpu_process, original_resources, plan::RenderClip, ported, source_effects,
    video, write_lut,
};
use crate::{
    media::{self, Cancel},
    Project,
};
use std::{
    fs,
    path::{Path, PathBuf},
};

// Four transient RGBA frame streams (two inputs, result, previous stage) share
// an estimated 256 MiB lossless-intermediate budget, with half-second maximum slices.
pub(super) fn add_boundaries(
    points: &mut Vec<i64>,
    clip: &crate::Clip,
    project: &Project,
    settings: &crate::media::ExportSettings,
) {
    let source_effect = source_effects::applied(clip);
    let transition = clip
        .transition
        .as_ref()
        .filter(|tr| ported::shader(&tr.kind).is_some());
    if !source_effect && transition.is_none() {
        return;
    }
    let per_frame = frame_bytes(clip, project, settings);
    let quantum =
        ((256 * 1024 * 1024 / per_frame).max(1) as i64).min(project.fps.frames(0.5).max(1));
    let stop = clip.start
        + if source_effect {
            clip.duration
        } else {
            transition.unwrap().frames.min(clip.duration)
        };
    let mut frame = clip.start;
    while let Some(next) = frame.checked_add(quantum).filter(|next| *next < stop) {
        points.push(next);
        frame = next;
    }
}

fn frame_bytes(
    clip: &crate::Clip,
    project: &Project,
    settings: &crate::media::ExportSettings,
) -> u64 {
    let source_effect = source_effects::applied(clip);
    let output_pixels = u64::from(settings.width) * u64::from(settings.height);
    let source_pixels = if source_effect {
        clip.media_id
            .as_ref()
            .and_then(|id| project.assets.iter().find(|asset| &asset.id == id))
            .map_or(
                u64::from(project.width) * u64::from(project.height),
                |asset| u64::from(asset.width) * u64::from(asset.height),
            )
    } else {
        output_pixels
    };
    let source_layers = if source_effect {
        project
            .tracks
            .iter()
            .filter(|track| {
                track.kind == "video"
                    && track.clips.iter().any(|clip| {
                        !clip.props.original_effect.is_empty()
                            || !clip.props.original_filter.is_empty()
                    })
            })
            .count()
            .max(1) as u64
    } else {
        1
    };
    source_pixels.max(output_pixels) * 16 * source_layers
}

pub(super) struct Request<'a> {
    pub ffmpeg: &'a Path,
    pub project: &'a Project,
    pub active: &'a [&'a RenderClip],
    pub start: i64,
    pub end: i64,
    pub size: (u32, u32),
    pub directory: &'a Path,
    pub cancel: &'a Cancel,
    pub source_inputs: &'a [(usize, PathBuf)],
}
fn clip_filter(request: &Request<'_>, index: usize, count: usize) -> Result<String, String> {
    let rc = request.active[index];
    let lut = request.directory.join(format!("original-lut-{index}.cube"));
    let lut = if color::is_neutral(&rc.clip.props) {
        None
    } else {
        write_lut(&rc.clip, &lut)?;
        Some(lut.as_path())
    };
    Ok(video::chain(video::VideoInput {
        index,
        source_index: request
            .source_inputs
            .iter()
            .position(|(layer, _)| *layer == index)
            .map(|offset| count + offset),
        clip: rc,
        project: request.project,
        size: request.size,
        start: request.start,
        lut,
    }))
}
fn overlay(request: &Request<'_>, index: usize, base: &str, output: &str) -> String {
    let p = &request.active[index].clip.props;
    let scale = request.size.1 as f64 / request.project.height as f64;
    format!(
        "[{base}][v{index}]overlay=x=(W-w)/2+{}:y=(H-h)/2+{}:shortest=1:format=auto[{output}]",
        if p.animation.is_some() {
            0.
        } else {
            p.x * scale
        },
        if p.animation.is_some() {
            0.
        } else {
            p.y * scale
        }
    )
}
fn pair_inputs(
    request: &Request<'_>,
    index: usize,
    previous: &Option<(PathBuf, usize)>,
) -> (Vec<String>, Vec<String>) {
    let (w, h) = request.size;
    let p = request.project;
    let count = index + 1;
    let mut args = encoding::input_args(&request.active[..count], request.start, request.end, p);
    source_effects::input_args(&mut args, request.source_inputs);
    let mut filters = vec![];
    if let Some((file, _)) = previous {
        args.extend(media::strings(&[
            "-threads",
            "2",
            "-i",
            &file.to_string_lossy(),
        ]));
        filters.push(format!(
            "[{}:v]setpts=PTS-STARTPTS,format=rgba[base]",
            count + request.source_inputs.len()
        ));
    } else {
        filters.push(format!(
            "color=c=black:s={w}x{h}:r={}/{}:d={},format=rgba[base]",
            p.fps.num,
            p.fps.den,
            p.fps.seconds(request.end - request.start)
        ));
    }
    (args, filters)
}
fn pair_filters(
    request: &Request<'_>,
    index: usize,
    previous: &Option<(PathBuf, usize)>,
) -> Result<Vec<String>, String> {
    let mut filters = vec![];
    let mut base = "base".to_string();
    for j in 0..index {
        if request.active[j].kind != "video"
            || previous.as_ref().is_some_and(|(_, last)| j <= *last)
        {
            continue;
        }
        filters.push(clip_filter(request, j, index + 1)?);
        let next = format!("original-layer-{j}");
        filters.push(overlay(request, j, &base, &next));
        base = next;
    }
    filters.push(format!("[{base}]split=2[outgoing][background]"));
    filters.push(clip_filter(request, index, index + 1)?);
    filters.push(overlay(request, index, "background", "incoming"));
    Ok(filters)
}
fn pair(
    request: &Request<'_>,
    index: usize,
    previous: &Option<(PathBuf, usize)>,
) -> Result<(PathBuf, PathBuf), String> {
    let (mut args, mut filters) = pair_inputs(request, index, previous);
    filters.extend(pair_filters(request, index, previous)?);
    let script = request.directory.join(format!("original-pair-{index}.txt"));
    fs::write(&script, filters.join(";\n")).map_err(|e| e.to_string())?;
    args.extend(media::strings(&[
        "-y",
        "-filter_complex_script",
        &script.to_string_lossy(),
    ]));
    let a = request.directory.join(format!("original-a-{index}.mkv"));
    let b = request.directory.join(format!("original-b-{index}.mkv"));
    for (label, file) in [("[outgoing]", &a), ("[incoming]", &b)] {
        args.extend(media::strings(&[
            "-map",
            label,
            "-an",
            "-c:v",
            "ffv1",
            "-level",
            "3",
            "-threads",
            "2",
            "-pix_fmt",
            "bgra",
            "-frames:v",
            &(request.end - request.start).to_string(),
            &file.to_string_lossy(),
        ]));
    }
    media::capture(request.ffmpeg, &args, request.cancel, 1024)?;
    Ok((a, b))
}
fn render(
    request: &Request<'_>,
    index: usize,
    previous: &Option<(PathBuf, usize)>,
) -> Result<PathBuf, String> {
    let clip = &request.active[index].clip;
    let tr = clip.transition.as_ref().unwrap();
    let original = ported::shader(&tr.kind).unwrap();
    let (a, b) = pair(request, index, previous)?;
    let shader = original_resources::shader(request.directory, original)?;
    let helper = original_resources::runtime(request.directory)?;
    let output = request
        .directory
        .join(format!("original-result-{index}.mkv"));
    let (w, h) = request.size;
    let fps = &request.project.fps;
    let args = vec![
        shader.to_string_lossy().into_owned(),
        request.ffmpeg.to_string_lossy().into_owned(),
        a.to_string_lossy().into_owned(),
        b.to_string_lossy().into_owned(),
        output.to_string_lossy().into_owned(),
        w.to_string(),
        h.to_string(),
        fps.num.to_string(),
        fps.den.to_string(),
        (request.start - clip.start).to_string(),
        tr.frames.to_string(),
        (request.end - request.start).to_string(),
    ];
    gpu_process::run(&helper, &args, request.cancel)?;
    let _ = fs::remove_file(a);
    let _ = fs::remove_file(b);
    Ok(output)
}
pub(super) fn prepare(request: &Request<'_>) -> Result<Option<(PathBuf, usize)>, String> {
    let mut previous = None;
    for (index, rc) in request.active.iter().enumerate() {
        let Some(tr) = &rc.clip.transition else {
            continue;
        };
        if rc.kind != "video"
            || request.start >= rc.clip.start + tr.frames
            || ported::shader(&tr.kind).is_none()
        {
            continue;
        }
        let file = render(request, index, &previous)?;
        if let Some((old, _)) = &previous {
            let _ = fs::remove_file(old);
        }
        previous = Some((file, index));
    }
    Ok(previous)
}
