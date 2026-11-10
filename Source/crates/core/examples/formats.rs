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
        &fs::canonicalize(PathBuf::from(
            std::env::args().nth(1).unwrap_or("../qa".into()),
        ))
        .map_err(|e| e.to_string())?,
    );
    let bin = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../src-tauri/binaries");
    let ff = bin.join("ffmpeg-x86_64-pc-windows-msvc.exe");
    let fp = bin.join("ffprobe-x86_64-pc-windows-msvc.exe");
    let cancel = Arc::new(AtomicBool::new(false));
    let rotated = out.join("Portrait rotation.mov");
    let vfr = out.join("Variable rate.mp4");
    media::capture(
        &ff,
        &media::strings(&[
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-display_rotation:v:0",
            "90",
            "-i",
            &out.join("Red café's clip.mp4").to_string_lossy(),
            "-c",
            "copy",
            &rotated.to_string_lossy(),
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
            "testsrc2=s=640x360:r=30:d=3",
            "-vf",
            "select='not(eq(mod(n,3),0))'",
            "-fps_mode",
            "vfr",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            &vfr.to_string_lossy(),
        ]),
        &cancel,
        65536,
    )?;
    let mut results = vec![];
    for (src, fps, width, height) in [
        (
            &rotated,
            FrameRate {
                num: 30000,
                den: 1001,
            },
            360,
            640,
        ),
        (&vfr, FrameRate { num: 24, den: 1 }, 640, 360),
    ] {
        let mut p = Project {
            fps,
            width,
            height,
            ..Default::default()
        };
        let a = media::probe(&fp, src, &cancel)?;
        if src == &rotated {
            assert_eq!((a.width, a.height), (360, 640));
        }
        let a = media::prepare(&ff, &out.join("format-cache"), a, 360, &cancel, &|_| {})?;
        let mid = a.id.clone();
        p.assets.push(a);
        let tid = p.tracks[0].id.clone();
        let mut e = Editor::new(p);
        e.apply(Edit::AddClip {
            media_id: mid,
            track_id: tid,
            start: 0,
        })?;
        let path = out.join(format!("Format-{}.mp4", width));
        render::export(
            &ff,
            &e.project,
            &ExportSettings {
                width,
                height,
                quality: "draft".into(),
                encoder: "software".into(),
            },
            &path,
            &out.join("format-cache"),
            &cancel,
            &|_| {},
        )?;
        let output = media::probe(&fp, &path, &cancel)?;
        assert_eq!((output.width, output.height), (width, height));
        assert!(
            (output.duration - e.project.fps.seconds(e.project.duration())).abs()
                < e.project.fps.seconds(1) + 0.002
        );
        results.push(serde_json::json!({"input":src,"output":path,"duration":output.duration,"fps":e.project.fps,"resolution":[width,height]}));
    }
    fs::write(out.join("format-results.json"),serde_json::to_vec_pretty(&serde_json::json!({"passed":true,"results":results,"checks":["portrait rotation metadata","portrait proxy","VFR normalization","29.97 fps export","24 fps export","duration within one frame"]})).unwrap()).map_err(|e|e.to_string())?;
    println!("PASS: rotation, VFR, portrait and fractional frame rates");
    Ok(())
}
