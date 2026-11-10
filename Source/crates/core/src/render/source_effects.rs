use super::{encoding, gpu_process, original_resources, ported_export::Request};
use crate::{media, transition_sources};
use std::{fs, path::PathBuf};
pub(super) fn applied(clip: &crate::Clip) -> bool {
    (!clip.props.original_effect.is_empty() && clip.props.effect_strength > 0.)
        || (!clip.props.original_filter.is_empty() && clip.props.filter_strength > 0.)
}

pub(super) fn input_args(args: &mut Vec<String>, sources: &[(usize, PathBuf)]) {
    for (_, file) in sources {
        args.extend(media::strings(&[
            "-threads",
            "2",
            "-i",
            &file.to_string_lossy(),
        ]));
    }
}
fn decode(request: &Request<'_>, index: usize) -> Result<PathBuf, String> {
    let rc = request.active[index];
    let file = request
        .directory
        .join(format!("source-decoded-{index}.mkv"));
    let mut args = encoding::input_args(&[rc], request.start, request.end, request.project);
    args.extend(media::strings(&[
        "-map",
        "0:v",
        "-an",
        "-vf",
        &format!(
            "fps={}/{}",
            request.project.fps.num, request.project.fps.den
        ),
        "-frames:v",
        &(request.end - request.start).to_string(),
        "-c:v",
        "ffv1",
        "-level",
        "3",
        "-threads",
        "2",
        "-pix_fmt",
        "bgra",
        &file.to_string_lossy(),
    ]));
    media::capture(request.ffmpeg, &args, request.cancel, 1024)?;
    Ok(file)
}
fn process(
    request: &Request<'_>,
    index: usize,
    input: &std::path::Path,
    kind: &str,
) -> Result<PathBuf, String> {
    let rc = request.active[index];
    let entry = transition_sources::source(kind).ok_or("Unknown original effect")?;
    let strength = if entry.family == "filter" {
        rc.clip.props.filter_strength
    } else {
        rc.clip.props.effect_strength
    };
    let shader = original_resources::shader_with_strength(request.directory, entry, strength)?;
    let output = request.directory.join(format!("source-{index}-{kind}.mkv"));
    let fps = &request.project.fps;
    let args = vec![
        shader.to_string_lossy().into_owned(),
        request.ffmpeg.to_string_lossy().into_owned(),
        input.to_string_lossy().into_owned(),
        input.to_string_lossy().into_owned(),
        output.to_string_lossy().into_owned(),
        rc.width.to_string(),
        rc.height.to_string(),
        fps.num.to_string(),
        fps.den.to_string(),
        (request.start - rc.clip.start).to_string(),
        rc.clip.duration.to_string(),
        (request.end - request.start).to_string(),
    ];
    gpu_process::run(
        &original_resources::runtime(request.directory)?,
        &args,
        request.cancel,
    )?;
    Ok(output)
}
pub(super) fn prepare(request: &Request<'_>) -> Result<Vec<(usize, PathBuf)>, String> {
    let mut result = vec![];
    for (index, rc) in request.active.iter().enumerate() {
        let kinds = [
            (
                &rc.clip.props.original_effect,
                rc.clip.props.effect_strength,
            ),
            (
                &rc.clip.props.original_filter,
                rc.clip.props.filter_strength,
            ),
        ];
        if rc.kind != "video"
            || kinds
                .iter()
                .all(|(kind, strength)| kind.is_empty() || *strength == 0.)
        {
            continue;
        }
        let mut input = decode(request, index)?;
        for (kind, _) in kinds
            .into_iter()
            .filter(|(kind, strength)| !kind.is_empty() && *strength > 0.)
        {
            let next = process(request, index, &input, kind)?;
            let _ = fs::remove_file(input);
            input = next;
        }
        result.push((index, input));
    }
    Ok(result)
}
