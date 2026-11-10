use super::*;
use serde_json::json;

#[test]
fn originals_are_selected_conservatively_by_codec_and_container() {
    let compatible = json!({"streams": [
        {"codec_type":"video", "codec_name":"h264", "pix_fmt":"yuv420p", "width":1920,"height":1080},
        {"codec_type":"audio", "codec_name":"aac", "profile":"LC", "channels":2}
    ]});
    assert!(direct::can_preview(&compatible, "mp4"));
    assert!(!direct::can_preview(&compatible, "mkv"));
    for (field, value) in [
        ("codec_name", json!("av1")),
        ("pix_fmt", json!("yuv420p10le")),
        ("width", json!(7680)),
    ] {
        let mut input = compatible.clone();
        input["streams"][0][field] = value;
        assert!(!direct::can_preview(&input, "mp4"));
    }
    let mut surround = compatible.clone();
    surround["streams"][1]["channels"] = json!(6);
    assert!(!direct::can_preview(&surround, "mp4"));
}
#[test]
fn sdr_hevc_phone_video_tries_the_decoder_but_hdr_still_uses_a_proxy() {
    let mut phone = json!({"streams": [{"codec_type":"video", "codec_name":"hevc",
        "pix_fmt":"yuv420p", "width":1920,"height":1080,"color_transfer":"bt709"}]});
    assert!(direct::can_preview(&phone, "mp4"));
    phone["streams"][0]["color_transfer"] = json!("arib-std-b67");
    assert!(!direct::can_preview(&phone, "mp4"));
    phone["streams"][0]["color_transfer"] = json!("bt709");
    phone["streams"][0]["pix_fmt"] = json!("yuv420p10le");
    assert!(!direct::can_preview(&phone, "mp4"));
}
#[test]
fn browser_images_and_audio_do_not_need_a_video_conversion() {
    let image = json!({"streams":[{"codec_type":"video", "codec_name":"png"}]});
    assert!(direct::can_preview(&image, "png"));
    assert!(!direct::can_preview(&image, "tiff"));
    let audio = json!({"streams":[{"codec_type":"audio", "codec_name":"mp3", "channels":2}]});
    assert!(direct::can_preview(&audio, "mp3"));
    let unsupported = json!({"streams":[{"codec_type":"audio", "codec_name":"ac3", "channels":2}]});
    assert!(!direct::can_preview(&unsupported, "mp4"));
}
#[test]
fn concurrent_cache_requests_are_serialized_and_waiting_is_cancellable() {
    let path = std::env::temp_dir().join(format!("cache-lock-{}", id()));
    let lock = preparation_lock::entry_lock(&path);
    let cancel = Arc::new(AtomicBool::new(false));
    let guard = preparation_lock::acquire(&lock, &cancel).unwrap();
    let duplicate = preparation_lock::entry_lock(&path);
    assert!(Arc::ptr_eq(&lock, &duplicate));
    let stop = Arc::new(AtomicBool::new(true));
    assert!(preparation_lock::acquire(&duplicate, &stop).is_err());
    drop(guard);
    assert!(preparation_lock::acquire(&duplicate, &cancel).is_ok());
}
