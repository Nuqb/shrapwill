use super::*;
pub fn probe(ffprobe: &Path, path: &Path, cancel: &Cancel) -> Result<MediaAsset, String> {
    if !path.is_file() {
        return Err("The selected media file could not be found.".into());
    }
    let path = clean_path(&fs::canonicalize(path).map_err(|e| e.to_string())?);
    let args = vec![
        "-v".into(),
        "error".into(),
        "-show_streams".into(),
        "-show_format".into(),
        "-of".into(),
        "json".into(),
        path.to_string_lossy().into_owned(),
    ];
    let value: Value = serde_json::from_slice(&capture(ffprobe, &args, cancel, 1024 * 1024)?)
        .map_err(|e| e.to_string())?;
    let streams = value["streams"]
        .as_array()
        .ok_or("No media streams were found.")?;
    let video = streams
        .iter()
        .find(|s| s["codec_type"] == "video" && s["disposition"]["attached_pic"] != 1);
    let has_audio = streams.iter().any(|s| s["codec_type"] == "audio");
    if video.is_none() && !has_audio {
        return Err("This file has no supported video or audio stream.".into());
    }
    let ext = path
        .extension()
        .unwrap_or_default()
        .to_string_lossy()
        .to_lowercase();
    let is_image = ["png", "jpg", "jpeg", "bmp", "webp", "tif", "tiff"].contains(&ext.as_str());
    let duration = value["format"]["duration"]
        .as_str()
        .and_then(|s| s.parse::<f64>().ok())
        .or_else(|| video.and_then(|s| s["duration"].as_str().and_then(|s| s.parse().ok())))
        .unwrap_or(if is_image { 5. } else { 0. });
    if !is_image && (!duration.is_finite() || duration <= 0.) {
        return Err("Could not determine the media duration.".into());
    }
    let mut width = video.and_then(|v| v["width"].as_u64()).unwrap_or(0) as u32;
    let mut height = video.and_then(|v| v["height"].as_u64()).unwrap_or(0) as u32;
    if let Some(v) = video {
        let rotation = v["side_data_list"]
            .as_array()
            .and_then(|list| list.iter().find_map(|s| s["rotation"].as_i64()))
            .unwrap_or(0);
        if rotation.abs() % 180 == 90 {
            std::mem::swap(&mut width, &mut height)
        }
    }
    Ok(MediaAsset {
        id: id(),
        name: path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .into_owned(),
        path: path.to_string_lossy().into_owned(),
        kind: direct::media_kind(is_image, video.is_some()).into(),
        duration,
        width,
        height,
        has_audio,
        preview_path: direct::can_preview(&value, &ext)
            .then(|| path.to_string_lossy().into_owned()),
        thumbnail_path: None,
        waveform: vec![],
        missing: false,
    })
}
