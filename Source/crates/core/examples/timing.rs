use cutline_core::{
    media::{self, ExportSettings},
    render, *,
};
use std::{
    fs,
    path::PathBuf,
    sync::{atomic::AtomicBool, Arc},
};
fn main() -> Result<(), String> {
    let out = media::clean_path(
        &fs::canonicalize(std::env::args().nth(1).unwrap_or("../qa".into()))
            .map_err(|e| e.to_string())?,
    );
    let bin = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../src-tauri/binaries");
    let ff = bin.join("ffmpeg-x86_64-pc-windows-msvc.exe");
    let fp = bin.join("ffprobe-x86_64-pc-windows-msvc.exe");
    let cancel = Arc::new(AtomicBool::new(false));
    let a = media::probe(&fp, &out.join("Red café's clip.mp4"), &cancel)?;
    let mut p = Project {
        width: 64,
        height: 64,
        fps: FrameRate {
            num: 30000,
            den: 1001,
        },
        ..Default::default()
    };
    p.tracks[0].clips = (0..100)
        .map(|i| Clip {
            id: model::id(),
            media_id: Some(a.id.clone()),
            name: "One frame".into(),
            start: i,
            duration: 1,
            source_in: 0.,
            link: None,
            audio_enabled: false,
            props: Properties::default(),
            title: None,
            transition: None,
        })
        .collect();
    p.assets.push(a);
    let dest = out.join("Fractional-100-cuts.mp4");
    render::export(
        &ff,
        &p,
        &ExportSettings {
            width: 64,
            height: 64,
            quality: "draft".into(),
            encoder: "software".into(),
        },
        &dest,
        &out.join("timing-cache"),
        &cancel,
        &|_| {},
    )?;
    let a = media::probe(&fp, &dest, &cancel)?;
    let expected = p.fps.seconds(p.duration());
    let metadata = media::capture(
        &fp,
        &media::strings(&[
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-count_frames",
            "-show_entries",
            "stream=nb_read_frames",
            "-of",
            "csv=p=0",
            &dest.to_string_lossy(),
        ]),
        &cancel,
        65536,
    )?;
    let frames = String::from_utf8(metadata)
        .unwrap()
        .trim()
        .parse::<i64>()
        .unwrap();
    println!(
        "expected={expected}, actual={}, frames={frames}",
        a.duration
    );
    assert_eq!(frames, 100);
    assert!((a.duration - expected).abs() <= p.fps.seconds(1) + 0.001);
    fs::write(out.join("timing-results.json"),serde_json::to_vec_pretty(&serde_json::json!({"passed":true,"expectedSeconds":expected,"actualSeconds":a.duration,"frames":frames,"checks":["100 consecutive one-frame cuts","29.97 fps","duration within one frame"]})).unwrap()).map_err(|e|e.to_string())?;
    Ok(())
}
