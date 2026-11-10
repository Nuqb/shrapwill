use serde_json::Value;
pub(super) fn media_kind(is_image: bool, has_video: bool) -> &'static str {
    if is_image {
        return "image";
    }
    if has_video {
        "video"
    } else {
        "audio"
    }
}

fn audio_supported(stream: &Value) -> bool {
    if stream["codec_type"] != "audio" {
        return true;
    }
    let codec = stream["codec_name"].as_str().unwrap_or("");
    let channels = stream["channels"].as_u64().unwrap_or(99);
    channels <= 2
        && (codec == "mp3"
            || (codec == "aac" && stream["profile"] == "LC")
            || ["pcm_s16le", "pcm_s24le", "opus", "vorbis"].contains(&codec))
}

pub(super) fn can_preview(value: &Value, extension: &str) -> bool {
    let Some(streams) = value["streams"].as_array() else {
        return false;
    };
    if ["png", "jpg", "jpeg", "webp", "bmp"].contains(&extension) {
        return true;
    }
    if !streams.iter().all(audio_supported) {
        return false;
    }
    let video = streams
        .iter()
        .find(|s| s["codec_type"] == "video" && s["disposition"]["attached_pic"] != 1);
    let Some(video) = video else {
        return ["mp3", "wav", "m4a", "mp4", "webm", "ogg", "opus"].contains(&extension);
    };
    let width = video["width"].as_u64().unwrap_or(0);
    let height = video["height"].as_u64().unwrap_or(0);
    if width == 0 || height == 0 || width > 3840 || height > 3840 || width * height > 3840 * 2160 {
        return false;
    }
    browser_video_supported(video, extension)
}

fn browser_video_supported(video: &Value, extension: &str) -> bool {
    match extension {
        // Try SDR phone recordings in the native decoder too. If HEVC is unavailable
        // on this PC, the player's existing error path requests a compatible proxy.
        "mp4" | "m4v" => {
            ["h264", "hevc"]
                .iter()
                .any(|codec| video["codec_name"] == *codec)
                && video["pix_fmt"] == "yuv420p"
                && !["smpte2084", "arib-std-b67"]
                    .iter()
                    .any(|transfer| video["color_transfer"] == *transfer)
        }
        "webm" => {
            ["vp8", "vp9"]
                .iter()
                .any(|codec| video["codec_name"] == *codec)
                && video["pix_fmt"] == "yuv420p"
        }
        _ => false,
    }
}
